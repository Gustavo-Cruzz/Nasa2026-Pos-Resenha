// Offline pre-processing: MOD13Q1 250 m 16-day NDVI for one demonstration point, 2011-2025, via the ORNL DAAC MODIS web service.
// The service allows at most ten MODIS dates per request, so the series is fetched in blocks and written only if the whole
// series parses and at least 70% of the composites are valid. Usage: npm run fetch:modis-ndvi -- rio-verde
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { NDVI_FIXTURE_SITES, modisDateToIso, parseModisSubset, type NdviObservation } from '../lib/climate/ndvi.ts';

const slug = process.argv[2];
const site = NDVI_FIXTURE_SITES.find((item) => item.slug === slug);
if (!site) throw new Error(`Usage: fetch-modis-ndvi <${NDVI_FIXTURE_SITES.map((item) => item.slug).join('|')}>`);

const dates: string[] = [];
for (let year = 2011; year <= 2025; year += 1) for (let doy = 1; doy <= 353; doy += 16) dates.push(`A${year}${String(doy).padStart(3, '0')}`);
const base = 'https://modis.ornl.gov/rst/api/v1/MOD13Q1/subset';
const urlFor = (start: string, end: string) => `${base}?${new URLSearchParams({ latitude: String(site.latitude), longitude: String(site.longitude), band: '250m_16_days_NDVI', startDate: start, endDate: end, kmAboveBelow: '0', kmLeftRight: '0' })}`;

async function fetchBlock(start: string, end: string): Promise<NdviObservation[]> {
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      const response = await fetch(urlFor(start, end), { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(90_000) });
      if (response.ok) return parseModisSubset(await response.json());
      console.warn(`${start}-${end}: HTTP ${response.status} (attempt ${attempt})`);
    } catch (error) { console.warn(`${start}-${end}: ${error instanceof Error ? error.message : error} (attempt ${attempt})`); }
    await new Promise((resolve) => setTimeout(resolve, 3000 * attempt));
  }
  throw new Error(`MODIS service did not answer for ${start}-${end}; no fixture was written.`);
}

const observations: NdviObservation[] = [];
for (let index = 0; index < dates.length; index += 10) {
  const block = dates.slice(index, index + 10);
  observations.push(...await fetchBlock(block[0], block[block.length - 1]));
  console.log(`${observations.length}/${dates.length} composites`);
}
const unique = new Map(observations.map((item) => [item.date, item]));
const series = [...unique.values()].sort((a, b) => a.date.localeCompare(b.date));
const valid = series.filter((item) => item.ndvi !== null).length;
if (series.length < dates.length * 0.9 || valid < series.length * 0.7) throw new Error(`Series incomplete (${series.length} composites, ${valid} valid); no fixture was written.`);
if (modisDateToIso(dates[0]) === null) throw new Error('Internal date error.');

const destination = path.join(process.cwd(), 'data/ndvi');
await mkdir(destination, { recursive: true });
const raw = Buffer.from(`${JSON.stringify(series)}\n`);
await writeFile(path.join(destination, `${site.slug}.json`), raw);
await writeFile(path.join(destination, `${site.slug}.meta.json`), `${JSON.stringify({ sourceUrl: urlFor(dates[0], dates[9]).replace(/startDate=[^&]+&endDate=[^&]+/, 'startDate=A2011001&endDate=A2025353'), fetchedAt: new Date().toISOString(), sha256: createHash('sha256').update(raw).digest('hex'), requestedCoordinates: { latitude: site.latitude, longitude: site.longitude }, product: 'MOD13Q1', band: '250m_16_days_NDVI' }, null, 2)}\n`);
console.log(`NDVI fixture written for ${site.slug}: ${series.length} composites, ${valid} valid.`);
