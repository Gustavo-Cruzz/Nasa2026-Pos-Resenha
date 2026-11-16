import { describe, expect, it } from 'vitest';
import {
  CogFormatError, HttpStatusError, decodeTile, groupPixelsByTile, pixelForXY, planRanges, rangeReaderFromFetch, readCogHeader, readPixels, redactUrl,
} from '@/lib/climate/cog-reader';
import { buildTiledTiff, mockFetch } from './support/synthetic-cog';

const URL = 'https://example.test/blob/item_250m_16_days_NDVI.tif';
// 2 x 2 internal tiles of 16 x 16 int16; includes negative values and the -3000 fill.
const value = (row: number, col: number) => (row === 5 && col === 7 ? -3000 : row * 100 + col - 1500);
const base = { width: 32, height: 32, tileWidth: 16, tileLength: 16, value, geo: { originX: 1000, originY: 5000, pixelSize: 10 }, noData: '-3000' };

function setup(overrides: Partial<Parameters<typeof buildTiledTiff>[0]> = {}) {
  const tiff = buildTiledTiff({ ...base, ...overrides });
  const mock = mockFetch({ files: { [URL]: tiff.bytes } });
  return { tiff, mock, read: rangeReaderFromFetch(mock.fetch, URL) };
}

const ALL_PIXELS = Array.from({ length: 32 * 32 }, (_, i) => ({ row: Math.floor(i / 32), col: i % 32 }));

describe('COG reader', () => {
  for (const variant of [
    { name: 'deflate + predictor 2', compression: 8 as const, predictor: 2 as const },
    { name: 'deflate, no predictor', compression: 8 as const, predictor: 1 as const },
    { name: 'uncompressed', compression: 1 as const, predictor: 1 as const },
    { name: 'big-endian deflate + predictor 2', compression: 8 as const, predictor: 2 as const, littleEndian: false },
    { name: 'BigTIFF deflate', compression: 8 as const, predictor: 1 as const, bigTiff: true },
  ]) {
    it(`reads every pixel exactly (${variant.name}), fill passes through raw`, async () => {
      const { read } = setup(variant);
      const image = await readCogHeader(read);
      expect(image).toMatchObject({ width: 32, height: 32, tileWidth: 16, tileLength: 16, tilesAcross: 2, tilesDown: 2, compression: variant.compression, predictor: variant.predictor, sampleFormat: 2, bitsPerSample: 16, bigTiff: variant.bigTiff ?? false, noData: -3000 });
      const { values } = await readPixels(image, read, ALL_PIXELS);
      expect(values).toEqual(ALL_PIXELS.map((p) => value(p.row, p.col)));
      expect(values[5 * 32 + 7]).toBe(-3000);
    });
  }

  it('parses the geotransform and maps projected coordinates with floor', async () => {
    const { read } = setup();
    const image = await readCogHeader(read);
    expect(image.geoTransform).toEqual({ originX: 1000, originY: 5000, pixelWidth: 10, pixelHeight: 10 });
    expect(pixelForXY(image, 1000, 5000)).toEqual({ row: 0, col: 0 });
    expect(pixelForXY(image, 1079.9, 4880.1)).toEqual({ row: 11, col: 7 });
    expect(pixelForXY(image, 999.9, 4900)).toBeUndefined();
    expect(pixelForXY(image, 1320, 4900)).toBeUndefined();
  });

  it('fetches the header once and each needed internal tile exactly once', async () => {
    const { read, mock, tiff } = setup({ compression: 8, predictor: 2, tileGap: 4096 });
    const image = await readCogHeader(read, { initialBytes: 512 });
    expect(mock.requests).toHaveLength(1);
    mock.requests.length = 0;
    // Many pixels in tiles 0 and 3 only; tile 1 and 2 must never be fetched.
    const pixels = [{ row: 0, col: 0 }, { row: 3, col: 9 }, { row: 15, col: 15 }, { row: 20, col: 20 }, { row: 31, col: 31 }, { row: 16, col: 16 }];
    const { values, stats } = await readPixels(image, read, pixels, { coalesceGapBytes: -1 });
    expect(values).toEqual(pixels.map((p) => value(p.row, p.col)));
    expect(stats).toMatchObject({ tiles: 2, requests: 2 });
    const ranges = mock.requests.map((r) => r.range).sort();
    expect(ranges).toEqual([0, 3].map((t) => `bytes=${tiff.tileOffsets[t]}-${tiff.tileOffsets[t] + tiff.tileByteCounts[t] - 1}`).sort());
  });

  it('coalesces adjacent tile ranges into one request when the gap is small', async () => {
    const { read, mock } = setup({ compression: 8, predictor: 2, tileGap: 8 });
    const image = await readCogHeader(read);
    mock.requests.length = 0;
    const { values, stats } = await readPixels(image, read, ALL_PIXELS, { coalesceGapBytes: 16 });
    expect(values).toEqual(ALL_PIXELS.map((p) => value(p.row, p.col)));
    expect(stats).toMatchObject({ tiles: 4, requests: 1 });
    expect(mock.requests).toHaveLength(1);
    expect(planRanges(image, [0, 1, 2, 3], { coalesceGapBytes: 16, maxCoalescedBytes: image.tileByteCounts[0] + 8 + image.tileByteCounts[1] }).length).toBe(2);
  });

  it('extends the header read when IFD arrays fall beyond the first chunk', async () => {
    const { read, mock } = setup();
    const image = await readCogHeader(read, { initialBytes: 32 });
    expect(image.tileOffsets).toHaveLength(4);
    expect(mock.requests.length).toBeGreaterThan(1);
    expect(image.headerBytesFetched).toBeGreaterThan(32);
  });

  it('returns null for pixels outside the image and groups by tile', async () => {
    const { read } = setup();
    const image = await readCogHeader(read);
    const groups = groupPixelsByTile(image, [{ row: 0, col: 0 }, { row: 0, col: 20 }, { row: 1, col: 1 }, { row: -1, col: 0 }, { row: 40, col: 0 }]);
    expect([...groups.entries()]).toEqual([[0, [0, 2]], [1, [1]]]);
    const { values } = await readPixels(image, read, [{ row: -1, col: 0 }, { row: 2, col: 2 }, { row: 0, col: 32 }]);
    expect(values).toEqual([null, value(2, 2), null]);
  });

  it('rejects non-TIFF data, unsupported compression and short tiles', async () => {
    const junk = mockFetch({ files: { [URL]: new Uint8Array(64) } });
    await expect(readCogHeader(rangeReaderFromFetch(junk.fetch, URL))).rejects.toBeInstanceOf(CogFormatError);
    const { read } = setup();
    const image = await readCogHeader(read);
    expect(() => decodeTile({ ...image, compression: 1 }, new Uint8Array(10))).toThrow(CogFormatError);
    const lzw = buildTiledTiff({ ...base });
    new DataView(lzw.bytes.buffer).setUint16(8 + 2 + 3 * 12 + 8, 5, true); // Compression entry value -> LZW
    const lzwMock = mockFetch({ files: { [URL]: lzw.bytes } });
    await expect(readCogHeader(rangeReaderFromFetch(lzwMock.fetch, URL))).rejects.toThrow(/compression 5/);
  });

  it('surfaces HTTP errors with the query string redacted', async () => {
    const mock = mockFetch({});
    const read = rangeReaderFromFetch(mock.fetch, `${URL}?sv=2025&sig=SECRET`);
    const error = await read(0, 10).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(HttpStatusError);
    expect((error as HttpStatusError).status).toBe(404);
    expect(String((error as Error).message)).not.toContain('SECRET');
    expect(redactUrl('https://a/b?sig=x')).toBe('https://a/b?<redacted>');
  });
});
