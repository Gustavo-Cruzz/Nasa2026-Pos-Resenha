// Offline pre-processing: MOD13Q1 (Terra, NASA LP DAAC) 250 m 16-day NDVI, collection v061, 2011-2025, for one demonstration point.
// Source: the Microsoft Planetary Computer STAC catalog (collection modis-13Q1-061, cloud-optimized GeoTIFF copies of the LP DAAC product),
// which needs no login. The earlier ORNL DAAC subset service was returning HTTP 502/503. The fixture is written only if the whole series
// is complete (>= 90% of the expected composites) and at least 70% of the composites are valid.
// Usage: npm run fetch:modis-ndvi -- rio-verde|accra|new-delhi
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { NDVI_FIXTURE_SITES, ndviFromRaw, type NdviObservation } from '../lib/climate/ndvi.ts';

const slug = process.argv[2];
const found = NDVI_FIXTURE_SITES.find((item) => item.slug === slug);
if (!found) throw new Error(`Usage: fetch-modis-ndvi <${NDVI_FIXTURE_SITES.map((item) => item.slug).join('|')}>`);
const site = found;

const STAC = 'https://planetarycomputer.microsoft.com/api/stac/v1/search';
const DATA = 'https://planetarycomputer.microsoft.com/api/data/v1/item/point';
const COLLECTION = 'modis-13Q1-061';
const EXPECTED = 15 * 23;

async function json(url: string, init?: RequestInit): Promise<unknown> {
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      const response = await fetch(url, { ...init, signal: AbortSignal.timeout(60_000) });
      if (response.ok) return await response.json();
      console.warn(`${url.slice(0, 90)}: HTTP ${response.status} (attempt ${attempt})`);
    } catch (error) { console.warn(`${url.slice(0, 90)}: ${error instanceof Error ? error.message : error} (attempt ${attempt})`); }
    await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
  }
  throw new Error(`No answer from ${url.slice(0, 90)}; no fixture was written.`);
}

type Item = { id: string; start: string };
const items = new Map<string, Item>();
for (let year = 2011; year <= 2025; year += 1) {
  const body = { collections: [COLLECTION], intersects: { type: 'Point', coordinates: [site.longitude, site.latitude] }, datetime: `${year}-01-01T00:00:00Z/${year}-12-31T23:59:59Z`, limit: 200 };
  const result = await json(STAC, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }) as { features?: Array<{ id: string; properties: { start_datetime?: string } }> };
  for (const feature of result.features ?? []) {
    if (!feature.id.startsWith('MOD13Q1.') || !feature.properties.start_datetime) continue; // Terra only; Aqua (MYD13Q1) shares the collection
    const start = feature.properties.start_datetime.slice(0, 10);
    items.set(start, { id: feature.id, start });
  }
  console.log(`${year}: ${items.size} composites listed`);
}
if (items.size < EXPECTED * 0.9) throw new Error(`Only ${items.size}/${EXPECTED} composites found; no fixture was written.`);

const list = [...items.values()].sort((a, b) => a.start.localeCompare(b.start));
const observations: NdviObservation[] = new Array(list.length);
let cursor = 0; let done = 0;
async function worker() {
  while (cursor < list.length) {
    const index = cursor; cursor += 1;
    const item = list[index];
    const url = `${DATA}/${site.longitude},${site.latitude}?${new URLSearchParams({ collection: COLLECTION, item: item.id, assets: '250m_16_days_NDVI' })}`;
    const result = await json(url) as { values?: Array<number | null> };
    observations[index] = { date: item.start, ndvi: ndviFromRaw(result.values?.[0]) };
    done += 1;
    if (done % 50 === 0) console.log(`${done}/${list.length} values`);
  }
}
await Promise.all(Array.from({ length: 4 }, () => worker()));

const valid = observations.filter((item) => item.ndvi !== null).length;
if (valid < observations.length * 0.7) throw new Error(`Series incomplete (${observations.length} composites, ${valid} valid); no fixture was written.`);
const destination = path.join(process.cwd(), 'data/ndvi');
await mkdir(destination, { recursive: true });
const raw = Buffer.from(`${JSON.stringify(observations)}\n`);
await writeFile(path.join(destination, `${site.slug}.json`), raw);
await writeFile(path.join(destination, `${site.slug}.meta.json`), `${JSON.stringify({ sourceUrl: 'https://planetarycomputer.microsoft.com/dataset/modis-13Q1-061', provider: 'Microsoft Planetary Computer STAC (collection modis-13Q1-061): cloud-optimized copies of NASA LP DAAC MOD13Q1 v061', fetchedAt: new Date().toISOString(), sha256: createHash('sha256').update(raw).digest('hex'), requestedCoordinates: { latitude: site.latitude, longitude: site.longitude }, product: 'MOD13Q1', band: '250m_16_days_NDVI' }, null, 2)}\n`);
console.log(`NDVI fixture written for ${site.slug}: ${observations.length} composites, ${valid} valid.`);
