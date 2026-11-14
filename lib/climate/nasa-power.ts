import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { coordinatesSchema, type Coordinates } from '@/lib/schema';
import { isPilotLocation } from '@/lib/region';
import { historicalContextForCalendarDay, historicalPrecipitationByMonth, historicalPrecipitationForMonth, monthlyForYear, historicalWaterBalanceByMonth, historicalWaterContextForMonth, monthlyClimatology, type HistoricalCalendarDay, type YearMonth, type HistoricalPrecipitationMonth, type HistoricalWaterContextMonth, type MonthlyClimateSummary, type WaterBalanceMonth } from '@/lib/climate/indicators';
import { dayOfYear, et0Daily } from '@/lib/climate/et0';
import type { NdviContext } from '@/lib/climate/ndvi';
import { readNdviFixture } from '@/lib/climate/ndvi-fixture';
import { historicalErosivity, type Erosivity } from '@/lib/climate/erosivity';
import { drySpellsInRainySeason, rainySeasonFromBalance, rootZoneByMonth, type DrySpellSummary, type RainySeason, type RootZoneMonth } from '@/lib/climate/seasonality';

export const NASA_POWER_PERIOD = { start: '20110101', end: '20251231' } as const;
export const NASA_POWER_PARAMETERS = ['T2M', 'T2M_MAX', 'T2M_MIN', 'PRECTOTCORR', 'RH2M', 'WS2M', 'ALLSKY_SFC_SW_DWN'] as const;
export type NasaParameter = (typeof NASA_POWER_PARAMETERS)[number];
export const NASA_POWER_ENHANCED_PARAMETERS = ['IMERG_PRECTOT', 'GWETROOT', 'PS', 'TSOIL1'] as const;
export type EnhancedNasaParameter = (typeof NASA_POWER_ENHANCED_PARAMETERS)[number];

const expectedUnits: Record<NasaParameter, string> = {
  T2M: 'C', T2M_MAX: 'C', T2M_MIN: 'C', PRECTOTCORR: 'mm/day', RH2M: '%', WS2M: 'm/s', ALLSKY_SFC_SW_DWN: 'MJ/m^2/day',
};

const physicalRanges: Record<NasaParameter, readonly [number, number]> = {
  T2M: [-90, 70], T2M_MAX: [-90, 75], T2M_MIN: [-100, 65], PRECTOTCORR: [0, 2000], RH2M: [0, 100], WS2M: [0, 150], ALLSKY_SFC_SW_DWN: [0, 50],
};

export type ClimateDay = { date: string; tmeanC: number | null; tmaxC: number | null; tminC: number | null; precipMm: number | null; rhPct: number | null; windMps: number | null; solarMjM2Day: number | null; imergPrecipMm?: number | null; rootZoneWetness?: number | null; pressureKpa?: number | null; /** POWER soil temperature, layer 1 (MERRA-2, near-surface soil); modelled for the grid cell, not a probe reading. */ soilTempC?: number | null; /** FAO-56 ET0, climate context only; null when any input is missing. */ et0Mm?: number | null };
export type ClimateProvenance = { source: 'NASA_POWER'; requestedCoordinates: Coordinates; period: typeof NASA_POWER_PERIOD; fetchedAt: string; rawParameterNames: string[]; sourceUrl: string; timezone: 'UTC'; coveragePct: Record<NasaParameter, number> & Partial<Record<EnhancedNasaParameter, number>>; missingDays: string[]; warnings: string[] };
export type ClimateDataset = { daily: ClimateDay[]; provenance: ClimateProvenance };
export type ClimateContext = {
  status: 'available' | 'unavailable';
  origin: 'live' | 'verified_fixture' | 'unavailable';
  monthly: MonthlyClimateSummary[];
  plantingMonthPrecipitation: HistoricalPrecipitationMonth | null;
  historicalPrecipitationByMonth: HistoricalPrecipitationMonth[];
  /** Last complete year of the NASA POWER window, month by month (N/D where any day is missing). */
  lastYear?: { year: number; months: YearMonth[] };
  waterContext?: HistoricalWaterContextMonth | null;
  /** Monthly median of precipitation minus FAO-56 ET0: a climate indicator, not crop demand or an irrigation need. */
  waterBalanceByMonth?: WaterBalanceMonth[];
  /** Arnoldus Modified Fournier Index of rainfall aggressiveness; not soil loss. */
  erosivity?: Erosivity;
  /** MODIS NDVI monthly medians; only present for points with a hash-verified pre-processed fixture, otherwise N/D. */
  ndvi?: NdviContext;
  calendarDayContext?: HistoricalCalendarDay | null;
  /** Rainy-season months and in-season dry spells (veranicos) from the same daily series. Historical context, not a forecast. */
  seasonality?: { rainySeason: RainySeason | null; drySpells: DrySpellSummary | null };
  /** Monthly root-zone wetness (0–1): median of 2011–2025 next to the last year. */
  rootZoneByMonth?: RootZoneMonth[];
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
  const enhancedUnits: Record<EnhancedNasaParameter, string> = { IMERG_PRECTOT: 'mm/day', GWETROOT: '1', PS: 'kPa', TSOIL1: 'C' };
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
    pressureKpa: normalizedOptionalValue(parameterData.PS?.[date], [30, 110], fillValue),
    soilTempC: normalizedOptionalValue(parameterData.TSOIL1?.[date], [-50, 80], fillValue),
  })).map((day) => ({ ...day, et0Mm: et0Daily({ tmaxC: day.tmaxC, tminC: day.tminC, rhPct: day.rhPct, windMps2m: day.windMps, solarMjM2Day: day.solarMjM2Day, pressureKPa: day.pressureKpa, latitudeDeg: validCoordinates.latitude, dayOfYear: dayOfYear(day.date) }) }));
  const keyByParameter: Record<NasaParameter, keyof ClimateDay> = { T2M: 'tmeanC', T2M_MAX: 'tmaxC', T2M_MIN: 'tminC', PRECTOTCORR: 'precipMm', RH2M: 'rhPct', WS2M: 'windMps', ALLSKY_SFC_SW_DWN: 'solarMjM2Day' };
  const coveragePct = Object.fromEntries(NASA_POWER_PARAMETERS.map((parameter) => [parameter, Number((daily.filter((day) => day[keyByParameter[parameter]] !== null).length / daily.length * 100).toFixed(2))])) as ClimateProvenance['coveragePct'];
  if (parameterData.IMERG_PRECTOT) coveragePct.IMERG_PRECTOT = coverage(daily, 'imergPrecipMm');
  if (parameterData.GWETROOT) coveragePct.GWETROOT = coverage(daily, 'rootZoneWetness');
  if (parameterData.PS) coveragePct.PS = coverage(daily, 'pressureKpa');
  if (parameterData.TSOIL1) coveragePct.TSOIL1 = coverage(daily, 'soilTempC');
  const missingDays = daily.filter((day) => {
    const requiredMissing = [day.tmeanC, day.tmaxC, day.tminC, day.precipMm, day.rhPct, day.windMps, day.solarMjM2Day].some((value) => value === null);
    const enhancedMissing = (parameterData.IMERG_PRECTOT && day.imergPrecipMm === null) || (parameterData.GWETROOT && day.rootZoneWetness === null) || (parameterData.PS && day.pressureKpa === null);
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

const fixtureMetaSchema = z.object({ sourceUrl: z.string().url(), fetchedAt: z.string().datetime(), sha256: z.string().regex(/^[a-f0-9]{64}$/), requestedCoordinates: coordinatesSchema, period: z.object({ start: z.literal(NASA_POWER_PERIOD.start), end: z.literal(NASA_POWER_PERIOD.end) }), timezone: z.literal('UTC'), units: z.object({ T2M: z.literal('C'), T2M_MAX: z.literal('C'), T2M_MIN: z.literal('C'), PRECTOTCORR: z.literal('mm/day'), RH2M: z.literal('%'), WS2M: z.literal('m/s'), ALLSKY_SFC_SW_DWN: z.literal('MJ/m^2/day'), IMERG_PRECTOT: z.literal('mm/day'), GWETROOT: z.literal('1'), PS: z.literal('kPa').optional() }) });

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
export async function resolveClimateContext(coordinates: Coordinates, plantingMonth: number, calendarDay?: number): Promise<ClimateContext> {
  try {
    const dataset = await fetchNasaPower(coordinates);
    return withNdvi(contextFromDataset(dataset, plantingMonth, 'live', calendarDay), coordinates);
  } catch (error) {
    const fixture = await readVerifiedPilotFixture(coordinates);
    if (fixture) return withNdvi(contextFromDataset(fixture, plantingMonth, 'verified_fixture', calendarDay), coordinates);
    const reason = error instanceof ClimateDataError ? error.code : 'NASA_REQUEST_FAILED';
    return { status: 'unavailable', origin: 'unavailable', monthly: [], plantingMonthPrecipitation: null, historicalPrecipitationByMonth: [], waterContext: null, provenance: null, gaps: [`Historical NASA POWER climate is unavailable (${reason}). No Rio Verde fixture was used for this coordinate.`] };
  }
}

async function withNdvi(context: ClimateContext, coordinates: Coordinates): Promise<ClimateContext> {
  const ndvi = await readNdviFixture(coordinates);
  return ndvi ? { ...context, ndvi } : context;
}

function contextFromDataset(dataset: ClimateDataset, plantingMonth: number, origin: 'live' | 'verified_fixture', calendarDay?: number): ClimateContext {
  const waterBalance = historicalWaterBalanceByMonth(dataset.daily);
  const rainySeason = rainySeasonFromBalance(waterBalance);
  const lastYear = Number(NASA_POWER_PERIOD.end.slice(0, 4));
  return { status: 'available', origin, monthly: monthlyClimatology(dataset.daily), plantingMonthPrecipitation: historicalPrecipitationForMonth(dataset.daily, plantingMonth), historicalPrecipitationByMonth: historicalPrecipitationByMonth(dataset.daily), lastYear: { year: Number(NASA_POWER_PERIOD.end.slice(0, 4)), months: monthlyForYear(dataset.daily, Number(NASA_POWER_PERIOD.end.slice(0, 4))) }, waterContext: historicalWaterContextForMonth(dataset.daily, plantingMonth), waterBalanceByMonth: waterBalance, seasonality: { rainySeason, drySpells: drySpellsInRainySeason(dataset.daily, rainySeason) }, rootZoneByMonth: rootZoneByMonth(dataset.daily, lastYear), erosivity: historicalErosivity(dataset.daily), calendarDayContext: calendarDay ? historicalContextForCalendarDay(dataset.daily, plantingMonth, calendarDay) : null, provenance: dataset.provenance, gaps: dataset.provenance.warnings };
}

function normalizedOptionalValue(value: number | null | undefined, range: readonly [number, number], fillValue: number | undefined): number | null {
  if (value === null || value === undefined || !Number.isFinite(value) || value === -999 || value === fillValue) return null;
  return value >= range[0] && value <= range[1] ? value : null;
}

function coverage(daily: ClimateDay[], key: 'imergPrecipMm' | 'rootZoneWetness' | 'pressureKpa' | 'soilTempC'): number {
  return Number((daily.filter((day) => day[key] !== null && day[key] !== undefined).length / daily.length * 100).toFixed(2));
}
