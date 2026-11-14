/** Offline, reproducible training from the hash-verified Rio Verde NASA POWER fixture. */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { buildDrySpellSamples, chronologicalSplit, trainLogisticDrySpellModel } from '../lib/climate/dry-spell.ts';
import { dayOfYear, et0Daily } from '../lib/climate/et0.ts';

const raw = JSON.parse(await readFile(path.join(process.cwd(), 'data/nasa-power-rio-verde.json'), 'utf8')) as { properties: { parameter: Record<string, Record<string, number>> } };
const p = raw.properties.parameter;
const value = (key: string, date: string): number | null => { const item = p[key]?.[date]; return item === undefined || item === -999 ? null : item; };
const daily = Object.keys(p.T2M).sort().map((date) => {
  const row = { date, tmeanC: value('T2M', date), tmaxC: value('T2M_MAX', date), tminC: value('T2M_MIN', date), precipMm: value('PRECTOTCORR', date), rhPct: value('RH2M', date), windMps: value('WS2M', date), solarMjM2Day: value('ALLSKY_SFC_SW_DWN', date), pressureKpa: value('PS', date) };
  return { ...row, et0Mm: et0Daily({ tmaxC: row.tmaxC, tminC: row.tminC, rhPct: row.rhPct, windMps2m: row.windMps, solarMjM2Day: row.solarMjM2Day, pressureKPa: row.pressureKpa, latitudeDeg: -17.798, dayOfYear: dayOfYear(date) }) };
});
const artifacts = ([7, 15] as const).map((horizonDays) => trainLogisticDrySpellModel(chronologicalSplit(buildDrySpellSamples(daily, horizonDays), 30), horizonDays, '2026-11-14T00:00:00.000Z'));
await writeFile(path.join(process.cwd(), 'data/dry-spell-models.json'), `${JSON.stringify(artifacts, null, 2)}\n`);
console.log(artifacts.map((item) => `${item.horizonDays}d ${item.validationStatus}; test=${item.samples.test}; Brier model=${item.evaluation.model.brierScore}; climatology=${item.evaluation.baseline.brierScore}`).join('\n'));
