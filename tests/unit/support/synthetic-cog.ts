/** Test-only builder of tiny tiled GeoTIFFs and a Range-honouring fetch mock. Offline; no real MODIS data. */
import { deflateSync } from 'node:zlib';

export type SyntheticTiffOptions = {
  width: number;
  height: number;
  tileWidth: number;
  tileLength: number;
  value: (row: number, col: number) => number;
  compression?: 1 | 8;
  predictor?: 1 | 2;
  littleEndian?: boolean;
  bigTiff?: boolean;
  geo?: { originX: number; originY: number; pixelSize: number };
  noData?: string;
  /** Padding bytes between consecutive tiles on disk (like GDAL ghost leaders). */
  tileGap?: number;
};

type Field = { tag: number; type: number; values: number[] | string };
const SIZE: Record<number, number> = { 2: 1, 3: 2, 4: 4, 12: 8, 16: 8 };

export function buildTiledTiff(opts: SyntheticTiffOptions): { bytes: Uint8Array; tileOffsets: number[]; tileByteCounts: number[] } {
  const le = opts.littleEndian ?? true;
  const big = opts.bigTiff ?? false;
  const across = Math.ceil(opts.width / opts.tileWidth);
  const down = Math.ceil(opts.height / opts.tileLength);
  const tiles: Uint8Array[] = [];
  for (let tr = 0; tr < down; tr += 1) {
    for (let tc = 0; tc < across; tc += 1) {
      const raw = new Uint8Array(opts.tileWidth * opts.tileLength * 2);
      const dv = new DataView(raw.buffer);
      for (let r = 0; r < opts.tileLength; r += 1) {
        let previous = 0;
        for (let c = 0; c < opts.tileWidth; c += 1) {
          const row = tr * opts.tileLength + r;
          const col = tc * opts.tileWidth + c;
          const value = row < opts.height && col < opts.width ? opts.value(row, col) : 0;
          const u = value & 0xffff;
          const stored = opts.predictor === 2 ? (u - previous) & 0xffff : u;
          previous = u;
          dv.setUint16((r * opts.tileWidth + c) * 2, stored, le);
        }
      }
      tiles.push(opts.compression === 8 ? new Uint8Array(deflateSync(raw)) : raw);
    }
  }
  const offType = big ? 16 : 4;
  const fields: Field[] = [
    { tag: 256, type: 4, values: [opts.width] },
    { tag: 257, type: 4, values: [opts.height] },
    { tag: 258, type: 3, values: [16] },
    { tag: 259, type: 3, values: [opts.compression ?? 1] },
    { tag: 262, type: 3, values: [1] },
    { tag: 277, type: 3, values: [1] },
    { tag: 284, type: 3, values: [1] },
    { tag: 317, type: 3, values: [opts.predictor ?? 1] },
    { tag: 322, type: 3, values: [opts.tileWidth] },
    { tag: 323, type: 3, values: [opts.tileLength] },
    { tag: 324, type: offType, values: tiles.map(() => 0) },
    { tag: 325, type: offType, values: tiles.map((t) => t.byteLength) },
    { tag: 339, type: 3, values: [2] },
  ];
  if (opts.geo) {
    fields.push({ tag: 33550, type: 12, values: [opts.geo.pixelSize, opts.geo.pixelSize, 0] });
    fields.push({ tag: 33922, type: 12, values: [0, 0, 0, opts.geo.originX, opts.geo.originY, 0] });
  }
  if (opts.noData !== undefined) fields.push({ tag: 42113, type: 2, values: `${opts.noData}\0` });

  const headerSize = big ? 16 : 8;
  const entrySize = big ? 20 : 12;
  const inlineSize = big ? 8 : 4;
  const ifdSize = (big ? 8 : 2) + fields.length * entrySize + (big ? 8 : 4);
  const count = (f: Field) => (typeof f.values === 'string' ? f.values.length : f.values.length);
  let extra = headerSize + ifdSize;
  const extraOffsets = new Map<number, number>();
  for (const f of fields) {
    const size = SIZE[f.type] * count(f);
    if (size > inlineSize) { extraOffsets.set(f.tag, extra); extra += size + (size % 2); }
  }
  const gap = opts.tileGap ?? 0;
  const tileOffsets: number[] = [];
  let cursor = extra;
  for (const t of tiles) { cursor += gap; tileOffsets.push(cursor); cursor += t.byteLength; }
  (fields.find((f) => f.tag === 324) as Field).values = tileOffsets;

  const out = new Uint8Array(cursor);
  const dv = new DataView(out.buffer);
  out[0] = le ? 0x49 : 0x4d; out[1] = out[0];
  dv.setUint16(2, big ? 43 : 42, le);
  if (big) { dv.setUint16(4, 8, le); dv.setUint16(6, 0, le); dv.setBigUint64(8, BigInt(headerSize), le); } else dv.setUint32(4, headerSize, le);
  let p = headerSize;
  if (big) { dv.setBigUint64(p, BigInt(fields.length), le); p += 8; } else { dv.setUint16(p, fields.length, le); p += 2; }
  const writeValues = (f: Field, at: number) => {
    if (typeof f.values === 'string') { for (let i = 0; i < f.values.length; i += 1) out[at + i] = f.values.charCodeAt(i); return; }
    f.values.forEach((v, i) => {
      const o = at + i * SIZE[f.type];
      if (f.type === 3) dv.setUint16(o, v, le);
      else if (f.type === 4) dv.setUint32(o, v, le);
      else if (f.type === 16) dv.setBigUint64(o, BigInt(v), le);
      else if (f.type === 12) dv.setFloat64(o, v, le);
    });
  };
  for (const f of fields) {
    dv.setUint16(p, f.tag, le); dv.setUint16(p + 2, f.type, le);
    if (big) dv.setBigUint64(p + 4, BigInt(count(f)), le); else dv.setUint32(p + 4, count(f), le);
    const valuePos = p + (big ? 12 : 8);
    const at = extraOffsets.get(f.tag);
    if (at === undefined) writeValues(f, valuePos);
    else { if (big) dv.setBigUint64(valuePos, BigInt(at), le); else dv.setUint32(valuePos, at, le); writeValues(f, at); }
    p += entrySize;
  }
  tiles.forEach((t, i) => out.set(t, tileOffsets[i]));
  return { bytes: out, tileOffsets, tileByteCounts: tiles.map((t) => t.byteLength) };
}

export type RecordedRequest = { url: string; range?: string; method: string; body?: string };

/**
 * Fetch mock: serves `files` (keyed by URL without query string) honouring `Range: bytes=a-b`, and JSON `routes`
 * (keyed by URL without query, or a function). `script` can inject failures per URL before delegating.
 */
export function mockFetch(opts: {
  files?: Record<string, Uint8Array>;
  json?: (url: string, init?: RequestInit) => unknown | undefined;
  intercept?: (url: string, init: RequestInit | undefined, call: number) => Response | Error | undefined;
  delayMs?: number;
}) {
  const requests: RecordedRequest[] = [];
  let calls = 0;
  const fn = async (input: string, init?: RequestInit): Promise<Response> => {
    calls += 1;
    const headers = new Headers(init?.headers);
    const range = headers.get('range') ?? undefined;
    requests.push({ url: input, range, method: init?.method ?? 'GET', body: typeof init?.body === 'string' ? init.body : undefined });
    if (opts.delayMs) await new Promise((r) => setTimeout(r, opts.delayMs));
    const intercepted = opts.intercept?.(input, init, calls);
    if (intercepted instanceof Error) throw intercepted;
    if (intercepted) return intercepted;
    const base = input.split('?')[0];
    const file = opts.files?.[base];
    if (file) {
      const match = range ? /^bytes=(\d+)-(\d+)$/.exec(range) : null;
      if (!match) return new Response(file.slice(), { status: 200 });
      const start = Number(match[1]);
      const end = Math.min(Number(match[2]), file.byteLength - 1);
      return new Response(file.slice(start, end + 1), { status: 206, headers: { 'content-range': `bytes ${start}-${end}/${file.byteLength}` } });
    }
    const body = opts.json?.(input, init);
    if (body !== undefined) return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
    return new Response('not found', { status: 404 });
  };
  return { fetch: fn, requests };
}
