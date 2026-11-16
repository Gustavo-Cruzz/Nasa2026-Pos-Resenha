/**
 * NdviRasterSource adapters for MOD13Q1 v061 (Terra) 250m_16_days_NDVI on Microsoft Planetary Computer.
 * - createCogBatchSource: reads the item's cloud-optimized GeoTIFF directly (header + only the internal tiles that hold
 *   requested pixels), many municipalities per item. Preferred.
 * - createPointApiSource: explicit fallback, one call per point to the Planetary Computer point endpoint, low concurrency.
 * SAS tokens and signed URLs live only in memory for the duration of a request; they are never returned, logged or stored.
 * Relative imports only (scripts import this through node --experimental-strip-types).
 */
import type { NdviItem, NdviRasterSource } from './ndvi-brazil-types.ts';
import { NDVI_BAND, NDVI_COLLECTION } from './ndvi-brazil-types.ts';
import {
  CogFormatError, HttpStatusError, type CogImage, type FetchFn, type PixelRequest, type RangeReader,
  pixelForXY, rangeReaderFromFetch, readCogHeader, readPixels, redactUrl,
} from './cog-reader.ts';
import { modisPixelFor, modisTileFor, tileForXY, tileId, toSinusoidal } from './modis-sinusoidal.ts';

export const PC_STAC_API = 'https://planetarycomputer.microsoft.com/api/stac/v1';
export const PC_SAS_TOKEN_API = 'https://planetarycomputer.microsoft.com/api/sas/v1/token';
export const PC_POINT_API = 'https://planetarycomputer.microsoft.com/api/data/v1/item/point';
const TERRA_PREFIX = 'MOD13Q1.';

// ---------------------------------------------------------------------------------------------------------------------
// Concurrency limiter

export type Limiter = {
  <T>(task: () => Promise<T>): Promise<T>;
  readonly active: number;
  readonly pending: number;
  readonly limit: number;
};

/** Runs at most `n` tasks at once; extra tasks wait in FIFO order. */
export function createLimiter(n: number): Limiter {
  if (!Number.isInteger(n) || n < 1) throw new RangeError('Limiter size must be a positive integer');
  let active = 0;
  const queue: Array<() => void> = [];
  const next = () => {
    if (active >= n) return;
    const start = queue.shift();
    if (start) { active += 1; start(); }
  };
  const run = <T>(task: () => Promise<T>): Promise<T> => new Promise<T>((resolve, reject) => {
    queue.push(() => {
      Promise.resolve().then(task).then(resolve, reject).finally(() => { active -= 1; next(); });
    });
    next();
  });
  return Object.defineProperties(run, {
    active: { get: () => active },
    pending: { get: () => queue.length },
    limit: { value: n },
  }) as Limiter;
}

// ---------------------------------------------------------------------------------------------------------------------
// Retry

export type RetryOptions = {
  /** Extra attempts after the first. Default 5. */
  retries?: number;
  /** First backoff delay; doubles each attempt with jitter. Default 1000 ms. */
  baseDelayMs?: number;
  maxDelayMs?: number;
  random?: () => number;
  sleep?: (ms: number) => Promise<void>;
  onRetry?: (info: { attempt: number; delayMs: number; error: string }) => void;
};

/** Network errors, timeouts, 429 and 5xx are retryable; other HTTP statuses and format errors fail fast. */
export function isRetryable(error: unknown): boolean {
  if (error instanceof HttpStatusError) return error.status === 429 || error.status >= 500;
  if (error instanceof CogFormatError) return false;
  if (!(error instanceof Error)) return false;
  if (error.name === 'AbortError' || error.name === 'TimeoutError' || error instanceof TypeError) return true;
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' && /^(E[A-Z]+|UND_ERR)/.test(code);
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function errorMessage(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error);
  return text.replace(/(https?:\/\/[^\s?]+)\?\S*/g, '$1?<redacted>');
}

export async function withRetry<T>(task: (attempt: number) => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const retries = opts.retries ?? 5;
  const base = opts.baseDelayMs ?? 1000;
  const max = opts.maxDelayMs ?? 30_000;
  const random = opts.random ?? Math.random;
  const sleep = opts.sleep ?? defaultSleep;
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await task(attempt);
    } catch (error) {
      if (attempt >= retries || !isRetryable(error)) throw error;
      const ceiling = Math.min(max, base * 2 ** attempt);
      const delayMs = ceiling / 2 + random() * (ceiling / 2);
      opts.onRetry?.({ attempt: attempt + 1, delayMs, error: errorMessage(error) });
      await sleep(delayMs);
    }
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// Shared options and STAC listing

export type NdviSourceOptions = {
  fetch?: FetchFn;
  stacApi?: string;
  collection?: string;
  /** Per-request timeout. Default 60 s. */
  timeoutMs?: number;
  retry?: RetryOptions;
  /** Max simultaneous data requests (range reads or point calls). */
  concurrency?: number;
};

export type CogItemStats = { itemId: string; headerBytes: number; tiles: number; requests: number; bytes: number; ms: number; points: number };

export type CogBatchOptions = NdviSourceOptions & {
  sasTokenApi?: string;
  /** Bytes read for the TIFF header. Default 16 KiB (MOD13Q1 v061 headers are ~16 KB). */
  headerBytes?: number;
  coalesceGapBytes?: number;
  maxCoalescedBytes?: number;
  /** Refresh a SAS token this long before it expires. Default 5 min. */
  tokenRefreshMarginMs?: number;
  /** Parsed headers kept in memory (no secrets in them). Default 64. */
  headerCacheSize?: number;
  now?: () => number;
  onItemStats?: (stats: CogItemStats) => void;
};

export type PointApiOptions = NdviSourceOptions & { pointApi?: string };

type Ctx = { fetch: FetchFn; stacApi: string; collection: string; timeoutMs: number; retry: RetryOptions };

function context(opts: NdviSourceOptions): Ctx {
  return {
    fetch: opts.fetch ?? ((input, init) => fetch(input, init)),
    stacApi: (opts.stacApi ?? PC_STAC_API).replace(/\/$/, ''),
    collection: opts.collection ?? NDVI_COLLECTION,
    timeoutMs: opts.timeoutMs ?? 60_000,
    retry: opts.retry ?? {},
  };
}

async function fetchJson(ctx: Ctx, url: string, init: RequestInit = {}): Promise<unknown> {
  return withRetry(async () => {
    const response = await ctx.fetch(url, { ...init, signal: AbortSignal.timeout(ctx.timeoutMs) });
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      throw new HttpStatusError(response.status, `HTTP ${response.status} for ${redactUrl(url)}`);
    }
    return response.json() as Promise<unknown>;
  }, ctx.retry);
}

type StacFeature = { id?: unknown; properties?: Record<string, unknown>; assets?: Record<string, { href?: unknown }> };
type StacPage = { features?: StacFeature[]; links?: Array<{ rel?: string; href?: string; method?: string; body?: Record<string, unknown>; merge?: boolean }> };

function stripQuery(href: string): string {
  const index = href.indexOf('?');
  return index === -1 ? href : href.slice(0, index);
}

function itemFromFeature(feature: StacFeature): { item: NdviItem; href?: string } | undefined {
  if (typeof feature.id !== 'string' || !feature.id.startsWith(TERRA_PREFIX)) return undefined; // Terra only; Aqua (MYD13Q1) shares the collection
  const props = feature.properties ?? {};
  const start = typeof props.start_datetime === 'string' ? props.start_datetime.slice(0, 10) : undefined;
  const end = typeof props.end_datetime === 'string' ? props.end_datetime.slice(0, 10) : undefined;
  if (!start || !end) return undefined;
  const h = props['modis:horizontal-tile'];
  const v = props['modis:vertical-tile'];
  const tile = typeof h === 'number' && typeof v === 'number' ? tileId(h, v) : /\.(h\d{2}v\d{2})\./.exec(feature.id)?.[1];
  if (!tile) return undefined;
  const rawHref = feature.assets?.[NDVI_BAND]?.href;
  return { item: { id: feature.id, tile, start, end }, href: typeof rawHref === 'string' ? stripQuery(rawHref) : undefined };
}

async function listTerraItems(ctx: Ctx, year: number, bbox: [number, number, number, number], hrefs: Map<string, string>): Promise<NdviItem[]> {
  const body: Record<string, unknown> = {
    collections: [ctx.collection],
    bbox,
    datetime: `${year}-01-01T00:00:00Z/${year}-12-31T23:59:59Z`,
    limit: 1000,
    // No server-side `platform` filter: many items from 2024 on lack that property. Terra is selected by the MOD13Q1. id prefix (itemFromFeature).
    fields: { include: ['id', 'properties.start_datetime', 'properties.end_datetime', 'properties.modis:horizontal-tile', 'properties.modis:vertical-tile', `assets.${NDVI_BAND}.href`], exclude: [] },
  };
  const found = new Map<string, NdviItem>();
  let request: { url: string; init: RequestInit } | undefined = {
    url: `${ctx.stacApi}/search`,
    init: { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) },
  };
  for (let page = 0; request && page < 100; page += 1) {
    const result = (await fetchJson(ctx, request.url, request.init)) as StacPage;
    for (const feature of result.features ?? []) {
      const parsed = itemFromFeature(feature);
      // An item belongs to the year its composite starts in (the datetime filter also returns overlapping ones).
      if (!parsed || Number(parsed.item.start.slice(0, 4)) !== year) continue;
      // LP DAAC reprocessing republishes a composite under a newer production timestamp (last id segment): keep only the latest per tile+start.
      const key = `${parsed.item.tile}|${parsed.item.start}`;
      const previous = found.get(key);
      if (previous && productionStamp(previous.id) >= productionStamp(parsed.item.id)) continue;
      found.set(key, parsed.item);
      if (parsed.href) hrefs.set(parsed.item.id, parsed.href);
    }
    const next = result.links?.find((link) => link.rel === 'next' && typeof link.href === 'string');
    if (!next?.href) request = undefined;
    else if ((next.method ?? 'GET').toUpperCase() === 'POST') {
      const nextBody = next.merge ? { ...body, ...(next.body ?? {}) } : (next.body ?? body);
      request = { url: next.href, init: { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(nextBody) } };
    } else request = { url: next.href, init: { method: 'GET' } };
  }
  return [...found.values()].sort((a, b) => a.start.localeCompare(b.start) || a.tile.localeCompare(b.tile) || a.id.localeCompare(b.id));
}

/** "MOD13Q1.A2021257.h13v10.061.2021320112607" → "2021320112607". */
export function productionStamp(id: string): string { return id.split('.').at(-1) ?? ''; }

function pointInItemTile(item: NdviItem, latitude: number, longitude: number) {
  const xy = toSinusoidal(latitude, longitude);
  const tile = xy ? tileForXY(xy) : undefined;
  return xy && tile && tile.id === item.tile ? xy : undefined;
}

// ---------------------------------------------------------------------------------------------------------------------
// SAS tokens (in memory only)

type TokenEntry = { token: string; expiresAt: number };

function blobContainer(href: string): { account: string; container: string } | undefined {
  const match = /^https:\/\/([a-z0-9]+)\.blob\.core\.windows\.net\/([^/?]+)\//.exec(href);
  return match ? { account: match[1], container: match[2] } : undefined;
}

function createTokenCache(ctx: Ctx, api: string, marginMs: number, now: () => number) {
  const cache = new Map<string, TokenEntry>();
  const inflight = new Map<string, Promise<TokenEntry>>();
  return async (account: string, container: string, force = false): Promise<string> => {
    const key = `${account}/${container}`;
    const cached = cache.get(key);
    if (!force && cached && cached.expiresAt - marginMs > now()) return cached.token;
    let pending = inflight.get(key);
    if (!pending) {
      // The per-collection token endpoint signs the metadata container, not the COG container: ask per account/container.
      pending = (async () => {
        const result = (await fetchJson(ctx, `${api.replace(/\/$/, '')}/${account}/${container}`)) as { token?: unknown; 'msft:expiry'?: unknown };
        if (typeof result.token !== 'string' || !result.token) throw new Error(`SAS token endpoint returned no token for ${key}`);
        const expiry = typeof result['msft:expiry'] === 'string' ? Date.parse(result['msft:expiry']) : Number.NaN;
        return { token: result.token, expiresAt: Number.isFinite(expiry) ? expiry : now() + 30 * 60_000 };
      })();
      inflight.set(key, pending);
      pending.finally(() => inflight.delete(key)).catch(() => undefined);
    }
    const entry = await pending;
    cache.set(key, entry);
    return entry.token;
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// COG batch source

export function createCogBatchSource(opts: CogBatchOptions = {}): NdviRasterSource & { readonly limiter: Limiter } {
  const ctx = context(opts);
  const limiter = createLimiter(opts.concurrency ?? 8);
  const now = opts.now ?? Date.now;
  const tokens = createTokenCache(ctx, opts.sasTokenApi ?? PC_SAS_TOKEN_API, opts.tokenRefreshMarginMs ?? 5 * 60_000, now);
  const hrefs = new Map<string, string>();
  const headers = new Map<string, CogImage>();
  const headerCacheSize = opts.headerCacheSize ?? 64;

  async function resolveHref(item: NdviItem): Promise<string> {
    const known = hrefs.get(item.id);
    if (known) return known;
    const feature = (await fetchJson(ctx, `${ctx.stacApi}/collections/${encodeURIComponent(ctx.collection)}/items/${encodeURIComponent(item.id)}`)) as StacFeature;
    const href = itemFromFeature(feature)?.href;
    if (!href) throw new Error(`STAC item ${item.id} has no ${NDVI_BAND} asset`);
    hrefs.set(item.id, href);
    return href;
  }

  function readerFor(href: string): RangeReader {
    const blob = blobContainer(href);
    const signed = async (force: boolean) => (blob ? `${href}?${await tokens(blob.account, blob.container, force)}` : href);
    return (start, end) => withRetry(() => limiter(async () => {
      try {
        return await rangeReaderFromFetch(ctx.fetch, () => signed(false), { timeoutMs: ctx.timeoutMs })(start, end);
      } catch (error) {
        // Expired or revoked token: refresh once and retry this request.
        if (!(blob && error instanceof HttpStatusError && error.status === 403)) throw error;
        return rangeReaderFromFetch(ctx.fetch, () => signed(true), { timeoutMs: ctx.timeoutMs })(start, end);
      }
    }), ctx.retry);
  }

  return {
    mode: 'cog_batch',
    limiter,
    listItems: (year, bbox) => listTerraItems(ctx, year, bbox, hrefs),
    tileFor: modisTileFor,
    async sample(item, points) {
      const started = now();
      const href = await resolveHref(item);
      const read = readerFor(href);
      const cached = headers.get(href);
      const image = cached ?? (await readCogHeader(read, { initialBytes: opts.headerBytes }));
      const headerBytes = cached ? 0 : image.headerBytesFetched;
      if (!cached) {
        headers.set(href, image);
        if (headers.size > headerCacheSize) headers.delete(headers.keys().next().value as string);
      }
      const requests: PixelRequest[] = [];
      const slots: number[] = [];
      points.forEach((point, index) => {
        const xy = pointInItemTile(item, point.latitude, point.longitude);
        if (!xy) return;
        const pixel = image.geoTransform
          ? pixelForXY(image, xy.x, xy.y)
          : modisPixelFor(point.latitude, point.longitude, image.width);
        if (!pixel) return;
        requests.push({ row: pixel.row, col: pixel.col });
        slots.push(index);
      });
      const out: Array<number | null> = points.map(() => null);
      const { values, stats } = await readPixels(image, read, requests, { coalesceGapBytes: opts.coalesceGapBytes, maxCoalescedBytes: opts.maxCoalescedBytes });
      values.forEach((value, i) => { out[slots[i]] = value; });
      opts.onItemStats?.({ itemId: item.id, headerBytes, tiles: stats.tiles, requests: stats.requests, bytes: stats.bytes, ms: now() - started, points: requests.length });
      return out;
    },
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// Point API fallback

export function createPointApiSource(opts: PointApiOptions = {}): NdviRasterSource & { readonly limiter: Limiter } {
  const ctx = context(opts);
  const limiter = createLimiter(opts.concurrency ?? 2);
  const api = (opts.pointApi ?? PC_POINT_API).replace(/\/$/, '');
  const hrefs = new Map<string, string>();

  async function one(item: NdviItem, latitude: number, longitude: number): Promise<number | null> {
    if (!pointInItemTile(item, latitude, longitude)) return null;
    const url = `${api}/${longitude},${latitude}?${new URLSearchParams({ collection: ctx.collection, item: item.id, assets: NDVI_BAND })}`;
    try {
      const result = await withRetry(() => limiter(async () => {
        const response = await ctx.fetch(url, { signal: AbortSignal.timeout(ctx.timeoutMs) });
        if (!response.ok) {
          await response.body?.cancel().catch(() => undefined);
          throw new HttpStatusError(response.status, `HTTP ${response.status} for ${redactUrl(url)}`);
        }
        return (await response.json()) as { values?: unknown[] };
      }), ctx.retry);
      const value = result.values?.[0];
      return typeof value === 'number' && Number.isFinite(value) ? value : null;
    } catch (error) {
      // A definitive client error (e.g. point outside the raster) means "could not be read"; transient failures propagate.
      if (error instanceof HttpStatusError && !isRetryable(error)) return null;
      throw error;
    }
  }

  return {
    mode: 'point_api',
    limiter,
    listItems: (year, bbox) => listTerraItems(ctx, year, bbox, hrefs),
    tileFor: modisTileFor,
    sample: (item, points) => Promise.all(points.map((point) => one(item, point.latitude, point.longitude))),
  };
}
