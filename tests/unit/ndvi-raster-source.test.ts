import { describe, expect, it } from 'vitest';
import { HttpStatusError } from '@/lib/climate/cog-reader';
import { MODIS_GRID_ORIGIN_X, MODIS_GRID_ORIGIN_Y, MODIS_TILE_SIZE_M, fromSinusoidal } from '@/lib/climate/modis-sinusoidal';
import type { NdviItem } from '@/lib/climate/ndvi-brazil-types';
import { createCogBatchSource, createLimiter, createPointApiSource, isRetryable, withRetry } from '@/lib/climate/ndvi-raster-source';
import { buildTiledTiff, mockFetch } from './support/synthetic-cog';

const STAC = 'https://stac.test/api/stac/v1';
const SAS = 'https://stac.test/api/sas/v1/token';
const POINT = 'https://stac.test/api/data/v1/item/point';
const BLOB = 'https://modiseuwest.blob.core.windows.net/modis-061-cogs/MOD13Q1/13/10/2020001/MOD13Q1.A2020001.h13v10.061.2020326030403_250m_16_days_NDVI.tif';
const SECRET = 'SECRETSIG';

// Synthetic stand-in for tile h13v10: 32 x 32 px over the whole tile (2 x 2 internal tiles of 16 x 16), deflate + predictor 2.
const H = 13; const V = 10; const N = 32;
const PIXEL = MODIS_TILE_SIZE_M / N;
const ORIGIN_X = MODIS_GRID_ORIGIN_X + H * MODIS_TILE_SIZE_M;
const ORIGIN_Y = MODIS_GRID_ORIGIN_Y - V * MODIS_TILE_SIZE_M;
const value = (row: number, col: number) => (row === 20 && col === 3 ? -3000 : 1000 + row * 50 + col);
const tiff = buildTiledTiff({ width: N, height: N, tileWidth: 16, tileLength: 16, value, compression: 8, predictor: 2, geo: { originX: ORIGIN_X, originY: ORIGIN_Y, pixelSize: PIXEL }, noData: '-3000' });
/** WGS84 centre of synthetic pixel (row, col). */
const at = (row: number, col: number) => fromSinusoidal(ORIGIN_X + (col + 0.5) * PIXEL, ORIGIN_Y - (row + 0.5) * PIXEL);

const ITEM: NdviItem = { id: 'MOD13Q1.A2020001.h13v10.061.2020326030403', tile: 'h13v10', start: '2020-01-01', end: '2020-01-16' };

function feature(id: string, start: string, h = 13, v = 10, href = `${BLOB}?st=x&sig=${SECRET}`) {
  const end = new Date(Date.parse(start) + 15 * 86_400_000).toISOString().slice(0, 10);
  return { id, properties: { start_datetime: `${start}T00:00:00Z`, end_datetime: `${end}T23:59:59Z`, 'modis:horizontal-tile': h, 'modis:vertical-tile': v }, assets: { '250m_16_days_NDVI': { href } } };
}

function stacJson(expiries: string[] = ['2099-01-01T00:00:00Z']) {
  let tokenCalls = 0;
  const json = (url: string, init?: RequestInit) => {
    if (url === `${SAS}/modiseuwest/modis-061-cogs`) { tokenCalls += 1; return { token: `sv=2025&sig=${SECRET}${tokenCalls}`, 'msft:expiry': expiries[Math.min(tokenCalls, expiries.length) - 1] }; }
    if (url === `${STAC}/search`) {
      const body = JSON.parse(String(init?.body)) as { token?: string };
      if (body.token === 'page2') return { features: [feature('MOD13Q1.A2020017.h13v10.061.2020328133400', '2020-01-17'), feature('MYD13Q1.A2020025.h13v10.061.2020328183152', '2020-01-25'), feature('MOD13Q1.A2020001.h13v10.061.2020001000000', '2020-01-01') /* older reprocessing of ITEM */], links: [] };
      return {
        features: [
          feature('MYD13Q1.A2020009.h13v10.061.2020327125333', '2020-01-09'),
          feature(ITEM.id, '2020-01-01'),
          feature('MOD13Q1.A2019353.h13v10.061.2020323152322', '2019-12-19'),
          feature('MOD13Q1.A2020001.h12v10.061.2020326030400', '2020-01-01', 12, 10),
        ],
        links: [{ rel: 'self', href: `${STAC}/search` }, { rel: 'next', href: `${STAC}/search`, method: 'POST', body: { token: 'page2' }, merge: true }],
      };
    }
    if (url === `${STAC}/collections/modis-13Q1-061/items/${ITEM.id}`) return feature(ITEM.id, '2020-01-01');
    return undefined;
  };
  return { json, tokenCalls: () => tokenCalls };
}

const fast = { retries: 3, baseDelayMs: 1, maxDelayMs: 1 };

function cogSource(extra: Parameters<typeof mockFetch>[0] = {}, opts: Parameters<typeof createCogBatchSource>[0] = {}) {
  const stac = stacJson();
  const mock = mockFetch({ files: { [BLOB]: tiff.bytes }, json: stac.json, ...extra });
  const source = createCogBatchSource({ fetch: mock.fetch, stacApi: STAC, sasTokenApi: SAS, retry: fast, coalesceGapBytes: -1, ...opts });
  const blobRequests = () => mock.requests.filter((r) => r.url.startsWith(BLOB));
  return { source, mock, stac, blobRequests };
}

describe('createLimiter', () => {
  it('never runs more than n tasks at once and runs them all', async () => {
    const limit = createLimiter(3);
    let inFlight = 0; let max = 0;
    const results = await Promise.all(Array.from({ length: 25 }, (_, i) => limit(async () => {
      inFlight += 1; max = Math.max(max, inFlight);
      await new Promise((r) => setTimeout(r, (i % 4) + 1));
      inFlight -= 1;
      if (i === 7) throw new Error('boom');
      return i;
    }).catch(() => -1)));
    expect(max).toBe(3);
    expect(results.filter((r) => r === -1)).toHaveLength(1);
    expect(results.filter((r) => r >= 0)).toHaveLength(24);
    expect(limit.active).toBe(0);
    expect(() => createLimiter(0)).toThrow();
  });
});

describe('withRetry', () => {
  it('retries 429/5xx/network errors with exponential backoff and jitter, fails fast on other 4xx', async () => {
    const delays: number[] = [];
    let calls = 0;
    const value = await withRetry(async () => {
      calls += 1;
      if (calls === 1) throw new HttpStatusError(503, 'busy');
      if (calls === 2) throw new HttpStatusError(429, 'slow down');
      if (calls === 3) throw new TypeError('fetch failed');
      return 'ok';
    }, { retries: 5, baseDelayMs: 100, maxDelayMs: 10_000, random: () => 1, sleep: async (ms) => { delays.push(ms); } });
    expect(value).toBe('ok');
    expect(delays).toEqual([100, 200, 400]);
    const jittered: number[] = [];
    await withRetry(async (attempt) => { if (attempt === 0) throw new HttpStatusError(500, 'x'); return 1; }, { baseDelayMs: 100, random: () => 0, sleep: async (ms) => { jittered.push(ms); } });
    expect(jittered).toEqual([50]);
    let notFound = 0;
    await expect(withRetry(async () => { notFound += 1; throw new HttpStatusError(404, 'nope'); }, { baseDelayMs: 0 })).rejects.toThrow('nope');
    expect(notFound).toBe(1);
    let always = 0;
    await expect(withRetry(async () => { always += 1; throw new HttpStatusError(502, 'down'); }, { retries: 2, baseDelayMs: 0 })).rejects.toThrow('down');
    expect(always).toBe(3);
    expect(isRetryable(new HttpStatusError(403, 'x'))).toBe(false);
    expect(isRetryable(new Error('logic'))).toBe(false);
  });
});

describe('createCogBatchSource', () => {
  it('lists Terra items only, by start year, across pages, without tokens or signatures', async () => {
    const { source, mock } = cogSource();
    const items = await source.listItems(2020, [-60, -20, -40, -5]);
    expect(source.mode).toBe('cog_batch');
    expect(items.map((i) => i.id)).toEqual([
      'MOD13Q1.A2020001.h12v10.061.2020326030400',
      ITEM.id,
      'MOD13Q1.A2020017.h13v10.061.2020328133400',
    ]);
    expect(items.every((i) => !i.id.startsWith('MYD13Q1.'))).toBe(true);
    expect(items[1]).toEqual(ITEM);
    expect(JSON.stringify(items)).not.toMatch(/sig|SECRET|\?/);
    expect(mock.requests.filter((r) => r.url === `${STAC}/search`)).toHaveLength(2);
    // Items from 2024 on lack `platform`, so no server-side platform filter may be sent.
    const searches = mock.requests.filter((r) => r.url === `${STAC}/search`);
    expect(searches.every((r) => r.body && !r.body.includes('platform'))).toBe(true);
  });

  it('samples many points from one item: raw values in order, -3000 passes through, outside-tile points are null', async () => {
    const { source, blobRequests, mock } = cogSource();
    await source.listItems(2020, [-60, -20, -40, -5]);
    const points = [at(0, 0), at(20, 3), at(31, 31), { latitude: -12.6, longitude: -55.9 } /* h12v10 */, at(5, 17), at(16, 16), at(1, 1)];
    const values = await source.sample(ITEM, points);
    expect(values).toEqual([value(0, 0), -3000, value(31, 31), null, value(5, 17), value(16, 16), value(1, 1)]);
    // 1 header read + 1 per internal tile touched (tiles 0, 1, 2, 3 -> 4), each internal tile fetched once.
    const ranges = blobRequests().map((r) => r.range);
    expect(ranges).toHaveLength(5);
    expect(new Set(ranges).size).toBe(5);
    // Signed URL used for blob requests only, never anywhere else.
    expect(blobRequests().every((r) => r.url.includes('sig='))).toBe(true);
    expect(mock.requests.filter((r) => r.url.includes('/token/'))).toHaveLength(1);
    // Second sample of the same item reuses the parsed header.
    await source.sample(ITEM, [at(0, 0)]);
    expect(blobRequests()).toHaveLength(6);
  });

  it('resolves the asset href from the STAC item when listItems was not called', async () => {
    const { source, mock } = cogSource();
    expect(await source.sample(ITEM, [at(2, 2)])).toEqual([value(2, 2)]);
    expect(mock.requests.some((r) => r.url.endsWith(`/items/${ITEM.id}`))).toBe(true);
  });

  it('retries simulated 503s and network errors, then succeeds', async () => {
    let failures = 0;
    const retries: string[] = [];
    const { source, blobRequests } = cogSource({
      intercept: (url) => {
        if (!url.startsWith(BLOB) || failures >= 3) return undefined;
        failures += 1;
        return failures === 2 ? new TypeError('fetch failed') : new Response('busy', { status: 503 });
      },
    }, { retry: { ...fast, onRetry: (info) => retries.push(info.error) } });
    expect(await source.sample(ITEM, [at(3, 3), at(30, 30)])).toEqual([value(3, 3), value(30, 30)]);
    expect(failures).toBe(3);
    expect(retries).toHaveLength(3);
    expect(retries.join(' ')).not.toContain(SECRET);
    expect(blobRequests().length).toBe(3 + 3);
  });

  it('fails fast on 404 without retrying and without leaking the token', async () => {
    const { source, blobRequests } = cogSource({ intercept: (url) => (url.startsWith(BLOB) ? new Response('missing', { status: 404 }) : undefined) });
    const error = await source.sample(ITEM, [at(0, 0)]).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(HttpStatusError);
    expect((error as HttpStatusError).status).toBe(404);
    expect((error as Error).message).not.toContain(SECRET);
    expect(blobRequests()).toHaveLength(1);
  });

  it('refreshes the SAS token once on 403 and retries; a second 403 fails', async () => {
    let denied = 0;
    const ok = cogSource({ intercept: (url) => (url.startsWith(BLOB) && denied++ === 0 ? new Response('expired', { status: 403 }) : undefined) });
    expect(await ok.source.sample(ITEM, [at(0, 0)])).toEqual([value(0, 0)]);
    expect(ok.stac.tokenCalls()).toBe(2);
    const bad = cogSource({ intercept: (url) => (url.startsWith(BLOB) ? new Response('denied', { status: 403 }) : undefined) });
    await expect(bad.source.sample(ITEM, [at(0, 0)])).rejects.toMatchObject({ status: 403 });
    expect(bad.blobRequests()).toHaveLength(2);
    expect(bad.stac.tokenCalls()).toBe(2);
  });

  it('refreshes the SAS token before it expires', async () => {
    let clock = Date.parse('2026-01-01T00:00:00Z');
    const stac = stacJson(['2026-01-01T00:30:00Z', '2026-01-01T02:00:00Z']);
    const mock = mockFetch({ files: { [BLOB]: tiff.bytes }, json: stac.json });
    const source = createCogBatchSource({ fetch: mock.fetch, stacApi: STAC, sasTokenApi: SAS, retry: fast, now: () => clock, tokenRefreshMarginMs: 5 * 60_000, headerCacheSize: 0 });
    await source.sample(ITEM, [at(0, 0)]);
    clock += 10 * 60_000;
    await source.sample(ITEM, [at(0, 0)]);
    expect(stac.tokenCalls()).toBe(1);
    clock += 16 * 60_000; // 4 min before expiry: inside the margin
    await source.sample(ITEM, [at(0, 0)]);
    expect(stac.tokenCalls()).toBe(2);
  });

  it('keeps range requests within the concurrency limit', async () => {
    let inFlight = 0; let max = 0;
    const base = mockFetch({ files: { [BLOB]: tiff.bytes }, json: stacJson().json });
    const counting = async (input: string, init?: RequestInit) => {
      const blob = input.startsWith(BLOB);
      if (blob) { inFlight += 1; max = Math.max(max, inFlight); }
      try { await new Promise((r) => setTimeout(r, 2)); return await base.fetch(input, init); } finally { if (blob) inFlight -= 1; }
    };
    const source = createCogBatchSource({ fetch: counting, stacApi: STAC, sasTokenApi: SAS, retry: fast, concurrency: 2, coalesceGapBytes: -1, headerCacheSize: 0 });
    const all = Array.from({ length: N * N }, (_, i) => at(Math.floor(i / N), i % N));
    const runs = await Promise.all([source.sample(ITEM, all), source.sample(ITEM, all), source.sample(ITEM, all)]);
    for (const run of runs) expect(run).toEqual(Array.from({ length: N * N }, (_, i) => value(Math.floor(i / N), i % N)));
    expect(max).toBe(2);
    expect(source.limiter.limit).toBe(2);
  });

  it('reports the MODIS tile for a point', () => {
    const { source } = cogSource();
    expect(source.tileFor(-17.798, -50.919)).toBe('h13v10');
    expect(source.tileFor(Number.NaN, 0)).toBeUndefined();
  });
});

describe('createPointApiSource', () => {
  it('reads one value per point from the point endpoint, null outside the tile or on 4xx, with low concurrency', async () => {
    let inFlight = 0; let max = 0;
    const base = mockFetch({
      json: (url, init) => {
        const stac = stacJson().json(url, init);
        if (stac !== undefined) return stac;
        if (url.startsWith(POINT)) {
          const [lon, lat] = url.slice(POINT.length + 1).split('?')[0].split(',').map(Number);
          if (lat > -11) return undefined; // -> 404
          return { values: [Math.round(lat * -100)], coordinates: [lon, lat] };
        }
        return undefined;
      },
    });
    const counting = async (input: string, init?: RequestInit) => {
      inFlight += 1; max = Math.max(max, inFlight);
      try { await new Promise((r) => setTimeout(r, 2)); return await base.fetch(input, init); } finally { inFlight -= 1; }
    };
    const source = createPointApiSource({ fetch: counting, stacApi: STAC, pointApi: POINT, retry: fast, concurrency: 2 });
    expect(source.mode).toBe('point_api');
    const items = await source.listItems(2020, [-60, -20, -40, -5]);
    expect(items.some((i) => i.id.startsWith('MYD13Q1.'))).toBe(false);
    max = 0;
    const values = await source.sample(ITEM, [{ latitude: -17.798, longitude: -50.919 }, { latitude: -12.6, longitude: -55.9 }, { latitude: -10.5, longitude: -48 }, { latitude: -18, longitude: -49 }]);
    expect(values).toEqual([1780, null, null, 1800]);
    expect(max).toBeLessThanOrEqual(2);
    const pointCalls = base.requests.filter((r) => r.url.startsWith(POINT));
    expect(pointCalls).toHaveLength(3); // the h12v10 point never leaves the process
    expect(pointCalls[0].url).toContain(`item=${ITEM.id}`);
    expect(pointCalls[0].url).toContain('assets=250m_16_days_NDVI');
  });

  it('propagates exhausted transient failures', async () => {
    const mock = mockFetch({ intercept: () => new Response('down', { status: 502 }) });
    const source = createPointApiSource({ fetch: mock.fetch, pointApi: POINT, retry: { retries: 1, baseDelayMs: 0 } });
    await expect(source.sample(ITEM, [{ latitude: -17.798, longitude: -50.919 }])).rejects.toMatchObject({ status: 502 });
    expect(mock.requests).toHaveLength(2);
  });
});

describe('productionStamp (reprocessed MOD13Q1 items)', async () => {
  const { productionStamp } = await import('@/lib/climate/ndvi-raster-source');
  it('orders reprocessed items by their production timestamp', () => {
    expect(productionStamp('MOD13Q1.A2021257.h13v10.061.2021320112607') > productionStamp('MOD13Q1.A2021257.h13v10.061.2021279212251')).toBe(true);
  });
});
