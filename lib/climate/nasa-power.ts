import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { coordinatesSchema, type Coordinates } from '@/lib/schema';
import { isPilotLocation } from '@/lib/region';
import { historicalPrecipitationByMonth, historicalPrecipitationForMonth, historicalWaterContextForMonth, monthlyClimatology, type HistoricalPrecipitationMonth, type HistoricalWaterContextMonth, type MonthlyClimateSummary } from '@/lib/climate/indicators';

export const NASA_POWER_PERIOD = { start: '20110101', end: '20251231' } as const;
export const NASA_POWER_PARAMETERS = ['T2M', 'T2M_MAX', 'T2M_MIN', 'PRECTOTCORR', 'RH2M', 'WS2M', 'ALLSKY_SFC_SW_DWN'] as const;
export type NasaParameter = (typeof NASA_POWER_PARAMETERS)[number];
export const NASA_POWER_ENHANCED_PARAMETERS = ['IMERG_PRECTOT', 'GWETROOT'] as const;
export type EnhancedNasaParameter = (typeof NASA_POWER_ENHANCED_PARAMETERS)[number];

const expectedUnits: Record<NasaParameter, string> = {
  T2M: 'C', T2M_MAX: 'C', T2M_MIN: 'C', PRECTOTCORR: 'mm/day', RH2M: '%', WS2M: 'm/s', ALLSKY_SFC_SW_DWN: 'MJ/m^2/day',
};

const physicalRanges: Record<NasaParameter, readonly [number, number]> = {
  T2M: [-90, 70], T2M_MAX: [-90, 75], T2M_MIN: [-100, 65], PRECTOTCORR: [0, 2000], RH2M: [0, 100], WS2M: [0, 150], ALLSKY_SFC_SW_DWN: [0, 50],
};

export type ClimateDay = { date: string; tmeanC: number | null; tmaxC: number | null; tminC: number | null; precipMm: number | null; rhPct: number | null; windMps: number | null; solarMjM2Day: number | null; imergPrecipMm?: number | null; rootZoneWetness?: number | null };
export type ClimateProvenance = { source: 'NASA_POWER'; requestedCoordinates: Coordinates; period: typeof NASA_POWER_PERIOD; fetchedAt: string; rawParameterNames: string[]; sourceUrl: string; timezone: 'UTC'; coveragePct: Record<NasaParameter, number> & Partial<Record<EnhancedNasaParameter, number>>; missingDays: string[]; warnings: string[] };
export type ClimateDataset = { daily: ClimateDay[]; provenance: ClimateProvenance };
export type ClimateContext = {
  status: 'available' | 'unavailable';
  origin: 'live' | 'verified_fixture' | 'unavailable';
  monthly: MonthlyClimateSummary[];
  plantingMonthPrecipitation: HistoricalPrecipitationMonth | null;
  historicalPrecipitationByMonth: HistoricalPrecipitationMonth[];
  waterContext?: HistoricalWaterContextMonth | null;
  provenance: ClimateProvenance | null;
  gaps: string[];
};

export class ClimateDataError extends Error {
  constructor(public readonly code: 'NASA_REQUEST_FAILED' | 'NASA_RESPONSE_INVALID' | 'NASA_COVERAGE_INSUFFICIENT', message: string) { super(message); }
}

type NasaPayload = { properties?: { parameter?: Record<string, Record<string, number | null>> }; parameters?: Record<string, { units?: string; unit?: string }>; header?: { fill_value?: number; start?: string; end?: string } };
type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export function buildNasaPowerUrl(coordinates: Coordinates): string {
  const valid = coordinatesSchema.parse(coordinates);
  const query = new URLSearchParams({ community: 'AG', format: 'JSON', 'time-standard': 'UTC', start: NASA_POWER_PERIOD.start, end: NASA_POWER_PERIOD.end, latitude: String(valid.latitude), longitude: String(valid.longitude), parameters: [...NASA_POWER_PARAMETERS, ...NASA_POWER_ENHANCED_PARAMETERS].join(',') });
  return `https://power.larc.nasa.gov/api/temporal/daily/point?${query.toString()}`;
}

function normalizedValue(value: number | null | undefined, parameter: NasaParameter, fillValue: number | undefined): number | null {
  if (value === null || value === undefined || !Number.isFinite(value) || value === -999 || value === fillValue) return null;
  const [min, max] = physicalRanges[parameter];
  return value >= min && value <= max ? value : null;
}

function parameterUnit(payload: NasaPayload, parameter: NasaParameter): string | undefined {
  const metadata = payload.parameters?.[parameter];
  return metadata?.units ?? metadata?.unit;
}

export function parseNasaPowerPayload(payload: unknown, coordinates: Coordinates, sourceUrl: string, fetchedAt = new Date().toISOString()): ClimateDataset {
  const validCoordinates = coordinatesSchema.parse(coordinates);
  const data = payload as NasaPayload;
  const parameterData = data.properties?.parameter;
  if (!parameterData || !NASA_POWER_PARAMETERS.every((parameter) => parameterData[parameter])) throw new ClimateDataError('NASA_RESPONSE_INVALID', 'NASA POWER response does not contain the requested daily parameters.');

  const warnings: string[] = [];
  for (const parameter of NASA_POWER_PARAMETERS) {
    const reportedUnit = parameterUnit(data, parameter);
    if (reportedUnit && reportedUnit !== expectedUnits[parameter]) warnings.push(`Unexpected unit for ${parameter}: ${reportedUnit}. Expected ${expectedUnits[parameter]}.`);
    if (!reportedUnit) warnings.push(`NASA POWER did not expose unit metadata for ${parameter}; values are preserved only in the documented request unit.`);
  }
  const enhancedUnits: Record<EnhancedNasaParameter, string> = { IMERG_PRECTOT: 'mm/day', GWETROOT: '1' };
  for (const parameter of NASA_POWER_ENHANCED_PARAMETERS) {
    if (!parameterData[parameter]) continue;
    const reportedUnit = data.parameters?.[parameter]?.units ?? data.parameters?.[parameter]?.unit;
    if (reportedUnit && reportedUnit !== enhancedUnits[parameter]) warnings.push(`Unexpected unit for ${parameter}: ${reportedUnit}. Expected ${enhancedUnits[parameter]}.`);
  }

  const dates = [...new Set(NASA_POWER_PARAMETERS.flatMap((parameter) => Object.keys(parameterData[parameter])))].sort();
  if (dates.length === 0) throw new ClimateDataError('NASA_RESPONSE_INVALID', 'NASA POWER response contains no daily dates.');
  const fillValue = data.header?.fill_value;
  const daily = dates.map((date) => ({
    date,
    tmeanC: normalizedValue(parameterData.T2M[date], 'T2M', fillValue),
    tmaxC: normalizedValue(parameterData.T2M_MAX[date], 'T2M_MAX', fillValue),
    tminC: normalizedValue(parameterData.T2M_MIN[date], 'T2M_MIN', fillValue),
    precipMm: normalizedValue(parameterData.PRECTOTCORR[date], 'PRECTOTCORR', fillValue),
    rhPct: normalizedValue(parameterData.RH2M[date], 'RH2M', fillValue),
    windMps: normalizedValue(parameterData.WS2M[date], 'WS2M', fillValue),
    solarMjM2Day: normalizedValue(parameterData.ALLSKY_SFC_SW_DWN[date], 'ALLSKY_SFC_SW_DWN', fillValue),
    imergPrecipMm: normalizedOptionalValue(parameterData.IMERG_PRECTOT?.[date], [0, 2000], fillValue),
    rootZoneWetness: normalizedOptionalValue(parameterData.GWETROOT?.[date], [0, 1], fillValue),
  }));
  const keyByParameter: Record<NasaParameter, keyof ClimateDay> = { T2M: 'tmeanC', T2M_MAX: 'tmaxC', T2M_MIN: 'tminC', PRECTOTCORR: 'precipMm', RH2M: 'rhPct', WS2M: 'windMps', ALLSKY_SFC_SW_DWN: 'solarMjM2Day' };
  const coveragePct = Object.fromEntries(NASA_POWER_PARAMETERS.map((parameter) => [parameter, Number((daily.filter((day) => day[keyByParameter[parameter]] !== null).length / daily.length * 100).toFixed(2))])) as ClimateProvenance['coveragePct'];
  if (parameterData.IMERG_PRECTOT) coveragePct.IMERG_PRECTOT = coverage(daily, 'imergPrecipMm');
  if (parameterData.GWETROOT) coveragePct.GWETROOT = coverage(daily, 'rootZoneWetness');
  const missingDays = daily.filter((day) => {
    const requiredMissing = [day.tmeanC, day.tmaxC, day.tminC, day.precipMm, day.rhPct, day.windMps, day.solarMjM2Day].some((value) => value === null);
    const enhancedMissing = (parameterData.IMERG_PRECTOT && day.imergPrecipMm === null) || (parameterData.GWETROOT && day.rootZoneWetness === null);
    return requiredMissing || Boolean(enhancedMissing);
  }).map((day) => day.date);
  return { daily, provenance: { source: 'NASA_POWER', requestedCoordinates: validCoordinates, period: NASA_POWER_PERIOD, fetchedAt, rawParameterNames: Object.keys(parameterData), sourceUrl, timezone: 'UTC', coveragePct, missingDays, warnings } };
}

export async function fetchNasaPower(coordinates: Coordinates, fetcher: FetchLike = fetch): Promise<ClimateDataset> {
  const sourceUrl = buildNasaPowerUrl(coordinates);
  let response: Response;
  try { response = await fetcher(sourceUrl, { signal: AbortSignal.timeout(12_000), next: { revalidate: 86_400 } }); }
  catch { throw new ClimateDataError('NASA_REQUEST_FAILED', 'NASA POWER could not be reached.'); }
  if (!response.ok) throw new ClimateDataError('NASA_REQUEST_FAILED', `NASA POWER returned HTTP ${response.status}.`);
  try { return parseNasaPowerPayload(await response.json(), coordinates, sourceUrl); }
  catch (error) { if (error instanceof ClimateDataError) throw error; throw new ClimateDataError('NASA_RESPONSE_INVALID', 'NASA POWER returned invalid JSON.'); }
}

const fixtureMetaSchema = z.object({ sourceUrl: z.string().url(), fetchedAt: z.string().datetime(), sha256: z.string().regex(/^[a-f0-9]{64}$/), requestedCoordinates: coordinatesSchema, period: z.object({ start: z.literal(NASA_POWER_PERIOD.start), end: z.literal(NASA_POWER_PERIOD.end) }), timezone: z.literal('UTC'), units: z.object({ T2M: z.literal('C'), T2M_MAX: z.literal('C'), T2M_MIN: z.literal('C'), PRECTOTCORR: z.literal('mm/day'), RH2M: z.literal('%'), WS2M: z.literal('m/s'), ALLSKY_SFC_SW_DWN: z.literal('MJ/m^2/day') }) });

export async function readVerifiedPilotFixture(coordinates: Coordinates): Promise<ClimateDataset | undefined> {
  if (!isPilotLocation(coordinates)) return undefined;
  const dataPath = path.join(process.cwd(), 'data/nasa-power-rio-verde.json');
  const metaPath = path.join(process.cwd(), 'data/nasa-power-rio-verde.meta.json');
  try {
    const [raw, rawMeta] = await Promise.all([readFile(dataPath), readFile(metaPath, 'utf8')]);
    const metadata = fixtureMetaSchema.parse(JSON.parse(rawMeta));
    if (metadata.requestedCoordinates.latitude !== coordinates.latitude || metadata.requestedCoordinates.longitude !== coordinates.longitude) return undefined;
    if (createHash('sha256').update(raw).digest('hex') !== metadata.sha256) return undefined;
    return parseNasaPowerPayload(JSON.parse(raw.toString('utf8')), coordinates, metadata.sourceUrl, metadata.fetchedAt);
  } catch { return undefined; }
}

/** Single climate acquisition path for both public routes. Fixture fallback is pilot-exact only. */
export async function resolveClimateContext(coordinates: Coordinates, plantingMonth: number): Promise<ClimateContext> {
  try {
    const dataset = await fetchNasaPower(coordinates);
    return contextFromDataset(dataset, plantingMonth, 'live');
  } catch (error) {
    const fixture = await readVerifiedPilotFixture(coordinates);
    if (fixture) return contextFromDataset(fixture, plantingMonth, 'verified_fixture');
    const reason = error instanceof ClimateDataError ? error.code : 'NASA_REQUEST_FAILED';
    return { status: 'unavailable', origin: 'unavailable', monthly: [], plantingMonthPrecipitation: null, historicalPrecipitationByMonth: [], waterContext: null, provenance: null, gaps: [`Historical NASA POWER climate is unavailable (${reason}). No Rio Verde fixture was used for this coordinate.`] };
  }
}

function contextFromDataset(dataset: ClimateDataset, plantingMonth: number, origin: 'live' | 'verified_fixture'): ClimateContext {
  return { status: 'available', origin, monthly: monthlyClimatology(dataset.daily), plantingMonthPrecipitation: historicalPrecipitationForMonth(dataset.daily, plantingMonth), historicalPrecipitationByMonth: historicalPrecipitationByMonth(dataset.daily), waterContext: historicalWaterContextForMonth(dataset.daily, plantingMonth), provenance: dataset.provenance, gaps: dataset.provenance.warnings };
}

function normalizedOptionalValue(value: number | null | undefined, range: readonly [number, number], fillValue: number | undefined): number | null {
  if (value === null || value === undefined || !Number.isFinite(value) || value === -999 || value === fillValue) return null;
  return value >= range[0] && value <= range[1] ? value : null;
}

function coverage(daily: ClimateDay[], key: 'imergPrecipMm' | 'rootZoneWetness'): number {
  return Number((daily.filter((day) => day[key] !== null && day[key] !== undefined).length / daily.length * 100).toFixed(2));
}
