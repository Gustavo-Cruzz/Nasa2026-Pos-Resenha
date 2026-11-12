import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const coordinates = { latitude: -17.798, longitude: -50.919 };
const period = { start: '20110101', end: '20251231' };
const parameters = ['T2M', 'T2M_MAX', 'T2M_MIN', 'PRECTOTCORR', 'RH2M', 'WS2M', 'ALLSKY_SFC_SW_DWN'];
const query = new URLSearchParams({ community: 'AG', format: 'JSON', 'time-standard': 'UTC', ...period, latitude: String(coordinates.latitude), longitude: String(coordinates.longitude), parameters: parameters.join(',') });
const sourceUrl = `https://power.larc.nasa.gov/api/temporal/daily/point?${query.toString()}`;
const response = await fetch(sourceUrl, { signal: AbortSignal.timeout(30_000) });
if (!response.ok) throw new Error(`NASA POWER returned HTTP ${response.status}; no fixture was written.`);
const raw = Buffer.from(await response.arrayBuffer());
const payload = JSON.parse(raw.toString('utf8'));
if (!parameters.every((parameter) => payload.properties?.parameter?.[parameter])) throw new Error('NASA POWER response lacks a requested parameter; no fixture was written.');
const units = Object.fromEntries(parameters.map((parameter) => {
  const unit = payload.parameters?.[parameter]?.units;
  if (typeof unit !== 'string') throw new Error(`NASA POWER metadata lacks a unit for ${parameter}; no fixture was written.`);
  return [parameter, unit];
}));
const destination = path.join(process.cwd(), 'data');
await mkdir(destination, { recursive: true });
await writeFile(path.join(destination, 'nasa-power-rio-verde.json'), raw);
await writeFile(path.join(destination, 'nasa-power-rio-verde.meta.json'), `${JSON.stringify({ sourceUrl, fetchedAt: new Date().toISOString(), sha256: createHash('sha256').update(raw).digest('hex'), requestedCoordinates: coordinates, period, timezone: 'UTC', units }, null, 2)}\n`);
console.log('Verified NASA POWER fixture written for Rio Verde (GO).');
