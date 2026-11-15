/**
 * Month-by-month scene weather for Future Farm Stories.
 * Everything here is a SCREENING classification of NASA POWER / IMERG historical medians, used only to pick which
 * illustration to draw. These are not agronomic thresholds, crop-damage limits or forecasts.
 */
import { cropById } from '@/lib/catalog';
import type { AnalysisResult } from '@/lib/engine/types';
import { slotSeasonWindow } from '@/lib/engine/slot-season';
import { slotWindow } from '@/lib/engine/slot-window';
import type { CycleWeather, MonthWeather } from '@/lib/future-farm/types';

/** Frost: share of historical years with at least one day Tmin <= 2 °C in that month. 1 year in 5 is already worth drawing. */
export const FROST_SHARE_MIN = 0.2;
/** Storm: median monthly rainfall (mm) that is wet-tail month for central Brazil (Rio Verde Jan median is ~205 mm, the wettest month; a 250 mm cut never fired there) */
export const STORM_PRECIP_MM = 200;
/** ...together with at least this many IMERG rain days (frequent, not a single burst). */
export const STORM_RAIN_DAYS = 20;
/** Storm fallback when IMERG rain days are unavailable: rainfall alone must be this high (stricter, since less evidence). */
export const STORM_PRECIP_MM_NO_RAIN_DAYS = 250;
/** Rain: median P−ET0 surplus (mm/month). About 1 mm/day of net surplus; the ±20 mm window tolerance is smaller because it is a sum over months. */
export const RAIN_BALANCE_MM = 30;
/** Heat: median daily Tmax (°C) at or above this is hot for most crops in the catalogue. */
export const HEAT_TMAX_C = 34;
/** Drought: median P−ET0 deficit (mm/month) at or below this (−2 mm/day), a clearly dry month. */
export const DROUGHT_BALANCE_MM = -60;
/** Cloudy: this many IMERG rain days (about every other day) without a surplus... */
export const CLOUDY_RAIN_DAYS = 12;
/** ...or median solar radiation at least this fraction below the location's own annual median solar. */
export const CLOUDY_SOLAR_DROP = 0.15;

/** Severity order used to break ties between equally frequent weathers (most severe first). */
export const WEATHER_SEVERITY: CycleWeather[] = ['storm', 'frost', 'drought', 'heat', 'rain', 'cloudy', 'sunny'];

export type MonthWeatherData = Omit<MonthWeather, 'weather' | 'month'>;
export interface ClassifyOptions {
  /** The location's annual median of monthly solar medians (MJ/m2/day), the reference for cloudiness. */
  annualSolarMjM2Day?: number | null;
}

/** Classifies one month. Priority: frost, storm, rain, heat, drought, cloudy, sunny; unknown when nothing is known. */
export function classifyMonth(data: MonthWeatherData, opts: ClassifyOptions = {}): CycleWeather {
  const { frostShare, precipMm, rainDays, balanceMm, tmaxC, solarMjM2Day } = data;
  const hasData = [data.balanceMm, data.precipMm, data.rainDays, data.tmaxC, data.tminC, data.solarMjM2Day, data.frostShare].some((value) => value !== null && value !== undefined);
  if (!hasData) return 'unknown';
  if (frostShare !== null && frostShare !== undefined && frostShare >= FROST_SHARE_MIN) return 'frost';
  if (precipMm !== null && precipMm !== undefined && (rainDays !== null && rainDays !== undefined ? precipMm >= STORM_PRECIP_MM && rainDays >= STORM_RAIN_DAYS : precipMm >= STORM_PRECIP_MM_NO_RAIN_DAYS)) return 'storm';
  if (balanceMm !== null && balanceMm !== undefined && balanceMm >= RAIN_BALANCE_MM) return 'rain';
  if (tmaxC !== null && tmaxC !== undefined && tmaxC >= HEAT_TMAX_C) return 'heat';
  if (balanceMm !== null && balanceMm !== undefined && balanceMm <= DROUGHT_BALANCE_MM) return 'drought';
  const annual = opts.annualSolarMjM2Day;
  const dim = solarMjM2Day !== null && solarMjM2Day !== undefined && annual !== null && annual !== undefined && annual > 0 && solarMjM2Day <= annual * (1 - CLOUDY_SOLAR_DROP);
  if ((rainDays !== null && rainDays !== undefined && rainDays >= CLOUDY_RAIN_DAYS) || dim) return 'cloudy';
  return 'sunny';
}

/** Most frequent weather; ties go to the more severe one. 'unknown' months are ignored; empty gives 'unknown'. */
export function dominantWeather(months: Pick<MonthWeather, 'weather'>[]): CycleWeather {
  const counts = new Map<CycleWeather, number>();
  for (const { weather } of months) {
    const key = weather === 'neutral' ? 'sunny' : weather;
    if (key !== 'unknown') counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let best: CycleWeather = 'unknown'; let bestCount = 0;
  for (const weather of WEATHER_SEVERITY) {
    const count = counts.get(weather) ?? 0;
    if (count > bestCount) { best = weather; bestCount = count; }
  }
  return best;
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b); const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/** Weather of every month of the crop's own window (same start/length rule as the engine indicators). [] when climate or window is unknown. */
export function windowMonthsWeather(analysis: AnalysisResult, cropId: string, season: 'A' | 'B'): MonthWeather[] {
  const climate = analysis.climate;
  if (!climate || climate.status !== 'available') return [];
  const start = slotSeasonWindow(analysis.input, season).month;
  const window = slotWindow(cropById.get(cropId), start, season);
  if (!window) return [];
  const solarByMonth = climate.monthly.flatMap((item) => item.solarMedianMjM2Day === null || item.solarMedianMjM2Day === undefined ? [] : [item.solarMedianMjM2Day]);
  const annualSolarMjM2Day = median(solarByMonth);
  return window.months.map((month) => {
    const monthly = climate.monthly.find((item) => item.month === month);
    const water = climate.waterBalanceByMonth?.find((item) => item.month === month);
    const context = climate.waterContextByMonth?.find((item) => item.month === month);
    const frost = climate.frostByMonth?.find((item) => item.month === month);
    const data: MonthWeatherData = {
      balanceMm: water?.balanceMedianMm ?? null,
      precipMm: water?.precipMedianMm ?? climate.historicalPrecipitationByMonth.find((item) => item.month === month)?.medianTotalMm ?? null,
      rainDays: context?.medianRainDays ?? null,
      tmaxC: monthly?.tmaxMedianC ?? null,
      tminC: monthly?.tminMedianC ?? null,
      solarMjM2Day: monthly?.solarMedianMjM2Day ?? null,
      frostShare: frost?.frostYearShare ?? null,
    };
    return { month, weather: classifyMonth(data, { annualSolarMjM2Day }), ...data };
  });
}
