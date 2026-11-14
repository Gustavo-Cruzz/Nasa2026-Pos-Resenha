import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const soilPath = resolve('data/soil/brazil-municipal-soil-v1.json');
const outputPath = resolve('data/soil/brazil-municipal-moisture-v1.json');
const cacheDirectory = resolve(process.env.NASA_MOISTURE_CACHE_DIR ?? '.cache/nasa-power-moisture');
const execute = process.argv.includes('--execute');
const baseUrl = 'https://power.larc.nasa.gov/api/temporal/monthly/regional';
const startYear = 2015; const climatologyEndYear = 2025; const endYear = Number(process.env.NASA_MOISTURE_END_YEAR ?? new Date().getUTCFullYear());
const tileMins = { longitude: [-80, -70, -60, -50, -40], latitude: [-40, -30, -20, -10, 0] };
const tiles = tileMins.latitude.flatMap((latitude) => tileMins.longitude.map((longitude) => ({ latitude, longitude })));
const round = (value, digits = 3) => Number(value.toFixed(digits));
const median = (values) => { if (!values.length) return null; const sorted = [...values].sort((a, b) => a - b); const middle = Math.floor(sorted.length / 2); return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2; };
const valid = (value) => Number.isFinite(value) && value !== -999 && value >= 0 && value <= 1;

function tileUrl({ latitude, longitude }) { const query = new URLSearchParams({ 'latitude-min': String(latitude), 'latitude-max': String(latitude + 10), 'longitude-min': String(longitude), 'longitude-max': String(longitude + 10), parameters: 'GWETROOT', community: 'AG', start: String(startYear), end: String(endYear), format: 'JSON' }); return `${baseUrl}?${query}`; }
async function download(url, path) { let failure; for (let attempt = 1; attempt <= 4; attempt += 1) try { const response = await fetch(url); if (!response.ok) throw new Error(`HTTP ${response.status}`); const payload = await response.json(); if (!Array.isArray(payload.features)) throw new Error('NASA POWER regional response has no features.'); await writeFile(path, `${JSON.stringify(payload)}\n`); return; } catch (error) { failure = error; } throw new Error(`NASA POWER download failed after 4 attempts: ${url}`, { cause: failure }); }

async function main() {
  if (!execute) { console.log('Validated moisture builder configuration. Add --execute to fetch NASA POWER and write the artifact.'); return; }
  await mkdir(cacheDirectory, { recursive: true }); await mkdir(resolve('data/soil'), { recursive: true });
  const sources = [];
  let cursor = 0;
  await Promise.all(Array.from({ length: 3 }, async () => { while (cursor < tiles.length) { const tile = tiles[cursor++]; const id = `${tile.longitude}_${tile.latitude}`; const path = resolve(cacheDirectory, `${id}.json`); const url = tileUrl(tile); if (!existsSync(path)) await download(url, path); const bytes = await readFile(path); sources.push({ id, url, sha256: createHash('sha256').update(bytes).digest('hex') }); } }));
  const grid = new Map();
  for (const source of sources) { const payload = JSON.parse(await readFile(resolve(cacheDirectory, `${source.id}.json`), 'utf8')); for (const feature of payload.features) { const [longitude, latitude] = feature.geometry.coordinates; const series = feature.properties?.parameter?.GWETROOT; if (series && !grid.has(`${longitude},${latitude}`)) grid.set(`${longitude},${latitude}`, { longitude, latitude, series }); } }
  const cells = [...grid.values()]; const soilBytes = await readFile(soilPath); const soil = JSON.parse(soilBytes); const entries = {};
  for (const [code, profile] of Object.entries(soil.entries)) {
    const point = profile.referencePoint; let cell = null; let distance = Infinity;
    for (const candidate of cells) { const d = (candidate.longitude - point.longitude) ** 2 + (candidate.latitude - point.latitude) ** 2; if (d < distance) { cell = candidate; distance = d; } }
    if (!cell || distance > 1) { entries[code] = { status: 'unavailable', municipality: profile.municipality, gridPoint: null, monthlyClimatology: Array(12).fill(null), latest: null }; continue; }
    const monthlyClimatology = Array.from({ length: 12 }, (_, index) => { const month = String(index + 1).padStart(2, '0'); const values = Object.entries(cell.series).filter(([key, value]) => Number(key.slice(0, 4)) <= climatologyEndYear && key.slice(4, 6) === month && valid(value)).map(([, value]) => value); const value = median(values); return value === null ? null : round(value); });
    const latestEntry = Object.entries(cell.series).filter(([key, value]) => key.slice(4, 6) !== '13' && valid(value)).sort(([a], [b]) => b.localeCompare(a))[0];
    const latest = latestEntry ? (() => { const [period, value] = latestEntry; const month = Number(period.slice(4, 6)); const baseline = Object.entries(cell.series).filter(([key, item]) => Number(key.slice(0, 4)) <= climatologyEndYear && Number(key.slice(4, 6)) === month && valid(item)).map(([, item]) => item); const percentile = baseline.length ? Math.round(100 * baseline.filter((item) => item <= value).length / baseline.length) : null; return { period, value: round(value), percentile, baselineYears: { start: startYear, end: climatologyEndYear } }; })() : null;
    entries[code] = { status: monthlyClimatology.every((value) => value !== null) && latest ? 'available' : 'partial', municipality: profile.municipality, gridPoint: { latitude: cell.latitude, longitude: cell.longitude }, monthlyClimatology, latest };
  }
  const counts = Object.values(entries).reduce((result, entry) => ({ ...result, [entry.status]: (result[entry.status] ?? 0) + 1 }), {});
  const artifact = { schemaVersion: 1, id: `nasa-power-brazil-municipal-gwetroot-${startYear}-${endYear}-v1`, status: counts.available === 5571 ? 'available' : 'partial', generatedAt: new Date().toISOString(), parameter: 'GWETROOT', unit: '1', classification: 'observed_modelled', temporal: { startYear, endYear, climatologyEndYear, latestPeriodVariesByGridCell: true }, spatial: { sourceResolution: 'NASA POWER meteorology grid; nearest grid cell to the municipality interior reference point', noFieldScaleClaim: true }, municipalitySource: { artifact: 'data/soil/brazil-municipal-soil-v1.json', sha256: createHash('sha256').update(soilBytes).digest('hex') }, source: { provider: 'NASA POWER', methodologyUrl: 'https://power.larc.nasa.gov/docs/methodology/data/sources_hydrology/' }, sources: sources.sort((a, b) => a.id.localeCompare(b.id)), coverage: { totalMunicipalities: 5571, ...counts }, entries, limitations: ['GWETROOT is a relative modelled root-zone wetness fraction, not volumetric field moisture or a sensor reading at the farm.', 'The latest monthly value is dated per grid cell and is not a forecast.', 'No value calculates irrigation need, crop water use, ETc or yield.'] };
  await writeFile(outputPath, `${JSON.stringify(artifact)}\n`); console.log(`Wrote ${outputPath}: ${JSON.stringify(artifact.coverage)}.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
