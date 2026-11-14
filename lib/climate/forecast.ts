import { z } from 'zod';
import { coordinatesSchema, type Coordinates } from '@/lib/schema';

const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';
const dailyNames = ['precipitation_sum', 'et0_fao_evapotranspiration', 'temperature_2m_max', 'temperature_2m_min'] as const;

export type ForecastDay = { date: string; precipitationMm: number | null; et0Mm: number | null; tmaxC: number | null; tminC: number | null };
export type MeteorologicalForecast = {
  kind: 'meteorological_forecast';
  source: 'Open-Meteo Forecast API';
  sourceUrl: string;
  issuedAt: string;
  horizonDays: number;
  location: Coordinates;
  timezone: string;
  model: 'best_match';
  units: { precipitation: 'mm'; et0: 'mm'; temperature: '°C' };
  et0Origin: 'provider_calculated_fao_reference_et0';
  days: ForecastDay[];
  limitations: string[];
};

export class ForecastDataError extends Error {
  constructor(message: string) { super(message); this.name = 'ForecastDataError'; }
}

const responseSchema = z.object({
  latitude: z.number(), longitude: z.number(), timezone: z.string(),
  daily_units: z.object({ precipitation_sum: z.string(), et0_fao_evapotranspiration: z.string(), temperature_2m_max: z.string(), temperature_2m_min: z.string() }),
  daily: z.object({ time: z.array(z.string().date()), precipitation_sum: z.array(z.number().nullable()), et0_fao_evapotranspiration: z.array(z.number().nullable()), temperature_2m_max: z.array(z.number().nullable()), temperature_2m_min: z.array(z.number().nullable()) }),
});

export function buildOpenMeteoForecastUrl(coordinates: Coordinates, forecastDays = 16): string {
  const point = coordinatesSchema.parse(coordinates);
  if (!Number.isInteger(forecastDays) || forecastDays < 1 || forecastDays > 16) throw new ForecastDataError('Forecast horizon must be between 1 and 16 days.');
  const params = new URLSearchParams({ latitude: String(point.latitude), longitude: String(point.longitude), daily: dailyNames.join(','), forecast_days: String(forecastDays), timezone: 'UTC', models: 'best_match' });
  return `${OPEN_METEO_URL}?${params}`;
}

function valid(value: number | null, min: number, max: number): number | null { return value !== null && Number.isFinite(value) && value >= min && value <= max ? value : null; }

/** Parses only documented daily units. Incomplete provider responses remain null; never zero-filled. */
export function parseOpenMeteoForecast(payload: unknown, coordinates: Coordinates, sourceUrl: string, issuedAt = new Date().toISOString()): MeteorologicalForecast {
  const data = responseSchema.safeParse(payload);
  if (!data.success) throw new ForecastDataError('Open-Meteo forecast response is incomplete or invalid.');
  const units = data.data.daily_units;
  if (units.precipitation_sum !== 'mm' || units.et0_fao_evapotranspiration !== 'mm' || units.temperature_2m_max !== '°C' || units.temperature_2m_min !== '°C') throw new ForecastDataError('Open-Meteo forecast units do not match the requested metric units.');
  const daily = data.data.daily;
  const length = daily.time.length;
  if (!length || [daily.precipitation_sum, daily.et0_fao_evapotranspiration, daily.temperature_2m_max, daily.temperature_2m_min].some((values) => values.length !== length)) throw new ForecastDataError('Open-Meteo forecast arrays have inconsistent lengths.');
  return {
    kind: 'meteorological_forecast', source: 'Open-Meteo Forecast API', sourceUrl, issuedAt, horizonDays: length, location: coordinatesSchema.parse(coordinates), timezone: data.data.timezone, model: 'best_match', units: { precipitation: 'mm', et0: 'mm', temperature: '°C' }, et0Origin: 'provider_calculated_fao_reference_et0',
    days: daily.time.map((date, index) => ({ date, precipitationMm: valid(daily.precipitation_sum[index], 0, 2_000), et0Mm: valid(daily.et0_fao_evapotranspiration[index], 0, 50), tmaxC: valid(daily.temperature_2m_max[index], -100, 75), tminC: valid(daily.temperature_2m_min[index], -100, 65) })),
    limitations: ['Meteorological model output is not a field observation.', 'Provider-calculated FAO reference ET0 is a climate indicator, not ETc, crop water use, irrigation need, or soil moisture.'],
  };
}

export async function fetchMeteorologicalForecast(coordinates: Coordinates, fetcher: typeof fetch = fetch): Promise<MeteorologicalForecast> {
  const sourceUrl = buildOpenMeteoForecastUrl(coordinates);
  let response: Response;
  try { response = await fetcher(sourceUrl, { signal: AbortSignal.timeout(8_000), next: { revalidate: 3_600 } }); } catch { throw new ForecastDataError('Meteorological forecast service is unavailable.'); }
  if (!response.ok) throw new ForecastDataError(`Meteorological forecast service returned HTTP ${response.status}.`);
  return parseOpenMeteoForecast(await response.json(), coordinates, sourceUrl);
}
