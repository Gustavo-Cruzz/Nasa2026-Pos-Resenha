/**
 * Minimal Cloud-Optimized GeoTIFF reader for single-band 16-bit integer rasters (MOD13Q1 250m_16_days_NDVI).
 * Reads only the header through HTTP Range requests, then only the internal tiles that hold requested pixels.
 * Supports classic TIFF and BigTIFF, tiled layout, compression none (1) and deflate (8 / 32946), predictor 1 and 2.
 * Node built-ins only (zlib). Relative imports only (scripts import this through node --experimental-strip-types).
 */
import { inflateSync } from 'node:zlib';

/** Reads bytes [start, endInclusive] of the remote file. */
export type RangeReader = (start: number, endInclusive: number) => Promise<Uint8Array>;

export type CogImage = {
  littleEndian: boolean;
  bigTiff: boolean;
  width: number;
  height: number;
  tileWidth: number;
  tileLength: number;
  tilesAcross: number;
  tilesDown: number;
  tileOffsets: number[];
  tileByteCounts: number[];
  compression: number;
  predictor: number;
  sampleFormat: number;
  bitsPerSample: number;
  samplesPerPixel: number;
  /** From ModelTiepoint + ModelPixelScale when present: upper-left corner and pixel size (height positive, rows go down). */
  geoTransform?: { originX: number; originY: number; pixelWidth: number; pixelHeight: number };
  /** GDAL_NODATA tag as a number, when present. */
  noData?: number;
  /** Bytes fetched to parse the header (initial read plus any out-of-range arrays). */
  headerBytesFetched: number;
};

export type PixelRequest = { row: number; col: number };

export type ReadPixelsOptions = {
  /** Merge two tile ranges when the gap between them is at most this many bytes. Negative disables merging. Default 1024. */
  coalesceGapBytes?: number;
  /** Never merge into a single request larger than this. Default 4 MiB. */
  maxCoalescedBytes?: number;
};

export type ReadPixelsStats = { tiles: number; requests: number; bytes: number };

const TAG = {
  ImageWidth: 256,
  ImageLength: 257,
  BitsPerSample: 258,
  Compression: 259,
  SamplesPerPixel: 277,
  PlanarConfiguration: 284,
  Predictor: 317,
  TileWidth: 322,
  TileLength: 323,
  TileOffsets: 324,
  TileByteCounts: 325,
  SampleFormat: 339,
  ModelPixelScale: 33550,
  ModelTiepoint: 33922,
  GdalNoData: 42113,
} as const;

const TYPE_SIZE: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 6: 1, 7: 1, 8: 2, 9: 4, 10: 8, 11: 4, 12: 8, 16: 8, 17: 8, 18: 8 };

export class CogFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CogFormatError';
  }
}

/** Non-success HTTP answer; `status` drives retry decisions. Messages never carry query strings. */
export class HttpStatusError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'HttpStatusError';
    this.status = status;
  }
}

export type FetchFn = (input: string, init?: RequestInit) => Promise<Response>;

/** Strips the query string (SAS tokens) from a URL so it can appear in messages. */
export function redactUrl(url: string): string {
  const index = url.indexOf('?');
  return index === -1 ? url : `${url.slice(0, index)}?<redacted>`;
}

/** Wraps an injectable fetch into a RangeReader. Rejects with HttpStatusError when the server does not answer 206/200. */
export function rangeReaderFromFetch(fetchFn: FetchFn, url: string | (() => string | Promise<string>), init?: { timeoutMs?: number }): RangeReader {
  return async (start, endInclusive) => {
    const target = typeof url === 'string' ? url : await url();
    const response = await fetchFn(target, {
      headers: { Range: `bytes=${start}-${endInclusive}` },
      signal: init?.timeoutMs ? AbortSignal.timeout(init.timeoutMs) : undefined,
    });
    if (response.status !== 206 && response.status !== 200) {
      await response.body?.cancel().catch(() => undefined);
      throw new HttpStatusError(response.status, `HTTP ${response.status} for ${redactUrl(target)} bytes=${start}-${endInclusive}`);
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (response.status === 200) return bytes.subarray(start, endInclusive + 1); // server ignored Range
    return bytes;
  };
}

type Entry = { tag: number; type: number; count: number; valueOffset: number; inline: Uint8Array | null };

/** Parses the first (full-resolution) IFD. Fetches `initialBytes` first and any arrays that fall outside it. */
export async function readCogHeader(read: RangeReader, opts: { initialBytes?: number } = {}): Promise<CogImage> {
  const initialBytes = opts.initialBytes ?? 16_384;
  let fetched = 0;
  let prefix = await read(0, initialBytes - 1);
  fetched += prefix.byteLength;

  async function bytesAt(offset: number, length: number): Promise<Uint8Array> {
    if (offset + length <= prefix.byteLength) return prefix.subarray(offset, offset + length);
    if (offset < 65_536 && offset + length <= 1_048_576) {
      // Header-sized data: extend the cached prefix instead of a one-off range.
      const extended = await read(prefix.byteLength, Math.max(offset + length, prefix.byteLength * 2) - 1);
      fetched += extended.byteLength;
      const merged = new Uint8Array(prefix.byteLength + extended.byteLength);
      merged.set(prefix, 0);
      merged.set(extended, prefix.byteLength);
      prefix = merged;
      if (offset + length > prefix.byteLength) throw new CogFormatError('TIFF header truncated');
      return prefix.subarray(offset, offset + length);
    }
    const chunk = await read(offset, offset + length - 1);
    fetched += chunk.byteLength;
    if (chunk.byteLength < length) throw new CogFormatError('TIFF header truncated');
    return chunk;
  }

  const head = await bytesAt(0, 16);
  const order = String.fromCharCode(head[0], head[1]);
  if (order !== 'II' && order !== 'MM') throw new CogFormatError('Not a TIFF file');
  const le = order === 'II';
  const view = (bytes: Uint8Array) => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const magic = view(head).getUint16(2, le);
  const bigTiff = magic === 43;
  if (!bigTiff && magic !== 42) throw new CogFormatError(`Unsupported TIFF magic ${magic}`);
  const ifdOffset = bigTiff ? Number(view(head).getBigUint64(8, le)) : view(head).getUint32(4, le);

  const countSize = bigTiff ? 8 : 2;
  const entrySize = bigTiff ? 20 : 12;
  const inlineSize = bigTiff ? 8 : 4;
  const countBytes = await bytesAt(ifdOffset, countSize);
  const entryCount = bigTiff ? Number(view(countBytes).getBigUint64(0, le)) : view(countBytes).getUint16(0, le);
  const table = await bytesAt(ifdOffset + countSize, entryCount * entrySize);
  const tv = view(table);
  const entries = new Map<number, Entry>();
  for (let i = 0; i < entryCount; i += 1) {
    const base = i * entrySize;
    const tag = tv.getUint16(base, le);
    const type = tv.getUint16(base + 2, le);
    const count = bigTiff ? Number(tv.getBigUint64(base + 4, le)) : tv.getUint32(base + 4, le);
    const valuePos = base + (bigTiff ? 12 : 8);
    const size = (TYPE_SIZE[type] ?? 1) * count;
    const inline = size <= inlineSize ? table.subarray(valuePos, valuePos + size) : null;
    const valueOffset = inline ? -1 : bigTiff ? Number(tv.getBigUint64(valuePos, le)) : tv.getUint32(valuePos, le);
    entries.set(tag, { tag, type, count, valueOffset, inline });
  }

  async function values(tag: number): Promise<number[] | undefined> {
    const entry = entries.get(tag);
    if (!entry) return undefined;
    const size = TYPE_SIZE[entry.type] ?? 1;
    const raw = entry.inline ?? (await bytesAt(entry.valueOffset, size * entry.count));
    const dv = view(raw);
    const out: number[] = new Array(entry.count);
    for (let i = 0; i < entry.count; i += 1) {
      const p = i * size;
      switch (entry.type) {
        case 1: case 2: case 7: out[i] = dv.getUint8(p); break;
        case 6: out[i] = dv.getInt8(p); break;
        case 3: out[i] = dv.getUint16(p, le); break;
        case 8: out[i] = dv.getInt16(p, le); break;
        case 4: out[i] = dv.getUint32(p, le); break;
        case 9: out[i] = dv.getInt32(p, le); break;
        case 11: out[i] = dv.getFloat32(p, le); break;
        case 12: out[i] = dv.getFloat64(p, le); break;
        case 16: out[i] = Number(dv.getBigUint64(p, le)); break;
        case 17: out[i] = Number(dv.getBigInt64(p, le)); break;
        default: throw new CogFormatError(`Unsupported TIFF field type ${entry.type} for tag ${tag}`);
      }
    }
    return out;
  }
  const one = async (tag: number, fallback?: number): Promise<number> => {
    const v = await values(tag);
    if (v?.length) return v[0];
    if (fallback === undefined) throw new CogFormatError(`Missing TIFF tag ${tag}`);
    return fallback;
  };

  const width = await one(TAG.ImageWidth);
  const height = await one(TAG.ImageLength);
  if (!entries.has(TAG.TileWidth) || !entries.has(TAG.TileOffsets)) throw new CogFormatError('TIFF is not tiled (strip layout is not supported)');
  const tileWidth = await one(TAG.TileWidth);
  const tileLength = await one(TAG.TileLength);
  const tileOffsets = (await values(TAG.TileOffsets)) ?? [];
  const tileByteCounts = (await values(TAG.TileByteCounts)) ?? [];
  const samplesPerPixel = await one(TAG.SamplesPerPixel, 1);
  const planar = await one(TAG.PlanarConfiguration, 1);
  const bitsPerSample = await one(TAG.BitsPerSample, 1);
  const compression = await one(TAG.Compression, 1);
  const predictor = await one(TAG.Predictor, 1);
  const sampleFormat = await one(TAG.SampleFormat, 1);
  const tilesAcross = Math.ceil(width / tileWidth);
  const tilesDown = Math.ceil(height / tileLength);
  if (samplesPerPixel !== 1 || planar !== 1) throw new CogFormatError('Only single-band rasters are supported');
  if (bitsPerSample !== 16 || (sampleFormat !== 1 && sampleFormat !== 2)) throw new CogFormatError(`Only 16-bit integer samples are supported (bits ${bitsPerSample}, format ${sampleFormat})`);
  if (tileOffsets.length < tilesAcross * tilesDown || tileByteCounts.length !== tileOffsets.length) throw new CogFormatError('Tile offset table does not match the image size');
  if (compression !== 1 && compression !== 8 && compression !== 32946) throw new CogFormatError(`Unsupported TIFF compression ${compression}`);
  if (predictor !== 1 && predictor !== 2) throw new CogFormatError(`Unsupported TIFF predictor ${predictor}`);

  const scale = await values(TAG.ModelPixelScale);
  const tie = await values(TAG.ModelTiepoint);
  const geoTransform = scale && tie && tie.length >= 6 && scale.length >= 2
    ? { originX: tie[3] - tie[0] * scale[0], originY: tie[4] + tie[1] * scale[1], pixelWidth: scale[0], pixelHeight: scale[1] }
    : undefined;
  let noData: number | undefined;
  const nd = entries.get(TAG.GdalNoData);
  if (nd) {
    const raw = nd.inline ?? (await bytesAt(nd.valueOffset, nd.count));
    const text = new TextDecoder().decode(raw).replace(/\0/g, '').trim();
    if (text !== '' && Number.isFinite(Number(text))) noData = Number(text);
  }

  return {
    littleEndian: le, bigTiff, width, height, tileWidth, tileLength, tilesAcross, tilesDown, tileOffsets, tileByteCounts,
    compression, predictor, sampleFormat, bitsPerSample, samplesPerPixel, geoTransform, noData, headerBytesFetched: fetched,
  };
}

/** Decompresses one internal tile into tileWidth*tileLength 16-bit values (signed or unsigned per SampleFormat). */
export function decodeTile(image: CogImage, compressed: Uint8Array): Int16Array | Uint16Array {
  const raw = image.compression === 1 ? compressed : new Uint8Array(inflateSync(compressed));
  const count = image.tileWidth * image.tileLength;
  if (raw.byteLength < count * 2) throw new CogFormatError(`Tile decoded to ${raw.byteLength} bytes, expected ${count * 2}`);
  const dv = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  const unsigned = new Uint16Array(count);
  for (let i = 0; i < count; i += 1) unsigned[i] = dv.getUint16(i * 2, image.littleEndian);
  if (image.predictor === 2) {
    for (let r = 0; r < image.tileLength; r += 1) {
      const base = r * image.tileWidth;
      for (let c = 1; c < image.tileWidth; c += 1) unsigned[base + c] = (unsigned[base + c] + unsigned[base + c - 1]) & 0xffff;
    }
  }
  return image.sampleFormat === 2 ? new Int16Array(unsigned.buffer) : unsigned;
}

/** Internal tile index for a pixel, or -1 when outside the image. */
export function tileIndexFor(image: CogImage, pixel: PixelRequest): number {
  if (!Number.isInteger(pixel.row) || !Number.isInteger(pixel.col) || pixel.row < 0 || pixel.col < 0 || pixel.row >= image.height || pixel.col >= image.width) return -1;
  return Math.floor(pixel.row / image.tileLength) * image.tilesAcross + Math.floor(pixel.col / image.tileWidth);
}

/** Groups pixel request indices by internal tile index (tiles outside the image are skipped). */
export function groupPixelsByTile(image: CogImage, pixels: PixelRequest[]): Map<number, number[]> {
  const groups = new Map<number, number[]>();
  pixels.forEach((pixel, index) => {
    const tile = tileIndexFor(image, pixel);
    if (tile < 0) return;
    const list = groups.get(tile);
    if (list) list.push(index); else groups.set(tile, [index]);
  });
  return groups;
}

export type ByteRange = { start: number; end: number; tiles: number[] };

/** Plans HTTP ranges for the given tiles, merging neighbours on disk when the gap is small. Empty (sparse) tiles are excluded. */
export function planRanges(image: CogImage, tiles: number[], opts: ReadPixelsOptions = {}): ByteRange[] {
  const gap = opts.coalesceGapBytes ?? 1024;
  const maxBytes = opts.maxCoalescedBytes ?? 4 * 1024 * 1024;
  const sorted = [...new Set(tiles)]
    .filter((t) => image.tileByteCounts[t] > 0)
    .sort((a, b) => image.tileOffsets[a] - image.tileOffsets[b]);
  const ranges: ByteRange[] = [];
  for (const tile of sorted) {
    const start = image.tileOffsets[tile];
    const end = start + image.tileByteCounts[tile] - 1;
    const last = ranges[ranges.length - 1];
    if (last && gap >= 0 && start - last.end - 1 <= gap && end - last.start + 1 <= maxBytes) {
      last.end = Math.max(last.end, end);
      last.tiles.push(tile);
    } else {
      ranges.push({ start, end, tiles: [tile] });
    }
  }
  return ranges;
}

/**
 * Reads many pixels from one image. Each internal tile is fetched once (ranges run in parallel; limit concurrency
 * inside the RangeReader). Pixels outside the image, or in sparse tiles without data, return null. Raw values pass
 * through unchanged (fill values included).
 */
export async function readPixels(
  image: CogImage,
  read: RangeReader,
  pixels: PixelRequest[],
  opts: ReadPixelsOptions = {},
): Promise<{ values: Array<number | null>; stats: ReadPixelsStats }> {
  const values: Array<number | null> = pixels.map(() => null);
  const groups = groupPixelsByTile(image, pixels);
  const ranges = planRanges(image, [...groups.keys()], opts);
  let bytes = 0;
  await Promise.all(ranges.map(async (range) => {
    const data = await read(range.start, range.end);
    if (data.byteLength < range.end - range.start + 1) throw new CogFormatError('Short read for tile range');
    bytes += data.byteLength;
    for (const tile of range.tiles) {
      const from = image.tileOffsets[tile] - range.start;
      const decoded = decodeTile(image, data.subarray(from, from + image.tileByteCounts[tile]));
      const tileRow = Math.floor(tile / image.tilesAcross);
      const tileCol = tile % image.tilesAcross;
      for (const index of groups.get(tile) ?? []) {
        const { row, col } = pixels[index];
        values[index] = decoded[(row - tileRow * image.tileLength) * image.tileWidth + (col - tileCol * image.tileWidth)];
      }
    }
  }));
  return { values, stats: { tiles: groups.size, requests: ranges.length, bytes } };
}

/** Pixel row/col for a projected coordinate using the image geotransform (floor, like GDAL/rasterio). */
export function pixelForXY(image: CogImage, x: number, y: number): PixelRequest | undefined {
  const gt = image.geoTransform;
  if (!gt) return undefined;
  const col = Math.floor((x - gt.originX) / gt.pixelWidth);
  const row = Math.floor((gt.originY - y) / gt.pixelHeight);
  if (row < 0 || col < 0 || row >= image.height || col >= image.width) return undefined;
  return { row, col };
}
