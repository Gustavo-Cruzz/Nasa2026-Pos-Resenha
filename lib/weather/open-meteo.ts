import { z } from 'zod';

/** Current conditions from Open-Meteo (CC BY 4.0): a weather-model analysis refreshed every 15 minutes. Not NASA data and not a measurement of the farm. */
export type LiveWeather = { time: string; temperatureC: number; apparentC: number | null; humidityPct: number | null; precipitationMm: number | null; windKmh: number | null; windDirectionDeg: number | null; gustsKmh: number | null; pressureHpa: number | null; cloudPct: number | null; isDay: boolean | null; timezone: string };

const number = z.number().finite().nullable().optional();
const responseSchema = z.object({ timezone: z.string(), current: z.object({ time: z.string(), temperature_2m: z.number().finite(), apparent_temperature: number, relative_humidity_2m: number, precipitation: number, wind_speed_10m: number, wind_direction_10m: number, wind_gusts_10m: number, surface_pressure: number, cloud_cover: number, is_day: z.number().nullable().optional() }) });

export function buildOpenMeteoUrl(latitude: number, longitude: number): string {
  const query = new URLSearchParams({ latitude: String(latitude), longitude: String(longitude), current: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,wind_speed_10m,wind_direction_10m,wind_gusts_10m,surface_pressure,cloud_cover,is_day', timezone: 'auto', wind_speed_unit: 'kmh' });
  return `https://api.open-meteo.com/v1/forecast?${query.toString()}`;
}

/** Any missing field stays null (shown as N/D); only the temperature is required for the reading to count. */
export function parseOpenMeteo(payload: unknown): LiveWeather | undefined {
  const parsed = responseSchema.safeParse(payload);
  if (!parsed.success) return undefined;
  const { current, timezone } = parsed.data;
  const value = (input: number | null | undefined) => input ?? null;
  return { time: current.time, temperatureC: current.temperature_2m, apparentC: value(current.apparent_temperature), humidityPct: value(current.relative_humidity_2m), precipitationMm: value(current.precipitation), windKmh: value(current.wind_speed_10m), windDirectionDeg: value(current.wind_direction_10m), gustsKmh: value(current.wind_gusts_10m), pressureHpa: value(current.surface_pressure), cloudPct: value(current.cloud_cover), isDay: current.is_day === null || current.is_day === undefined ? null : current.is_day === 1, timezone };
}

const POINTS_PT = ['N', 'NE', 'L', 'SE', 'S', 'SO', 'O', 'NO'];
const POINTS_EN = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
/** Compass point the wind blows FROM (meteorological convention). */
export function compassPoint(degrees: number, locale: 'pt-BR' | 'en'): string {
  return (locale === 'en' ? POINTS_EN : POINTS_PT)[Math.round((((degrees % 360) + 360) % 360) / 45) % 8];
}
