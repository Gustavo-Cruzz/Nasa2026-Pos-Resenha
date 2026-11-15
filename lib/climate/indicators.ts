import type { ClimateDay } from '@/lib/climate/nasa-power';

export type MonthlyClimateSummary = { month: number; tmeanMedianC: number | null; tminMedianC?: number | null; tmaxMedianC?: number | null; tsoilMedianC?: number | null; precipMedianMm: number | null; /** Median daily ALLSKY_SFC_SW_DWN (MJ/m2/day); optional, used only for scene cloudiness. */ solarMedianMjM2Day?: number | null; validTemperatureDays: number; validPrecipitationDays: number };
export type HistoricalPrecipitationMonth = { month: number; medianTotalMm: number | null; validYears: number; expectedYears: number; coveragePct: number };
export type HistoricalWaterContextMonth = { month: number; imergMedianTotalMm: number | null; medianRainDays: number | null; rootZoneWetnessMedian: number | null; validImergYears: number; expectedYears: number; imergCoveragePct: number; rootZoneCoveragePct: number };
/** Frost screen per calendar month: share of complete years with at least one day Tmin <= thresholdC, and the median count of such days. */
export type FrostMonth = { month: number; thresholdC: number; frostYears: number; validYears: number; expectedYears: number; frostYearShare: number | null; medianFrostDays: number | null };
export const FROST_SCREEN_THRESHOLD_C = 2;
/** Median monthly precipitation, FAO-56 ET0 and their difference across complete years only. Climate context; not crop demand. */
export type WaterBalanceMonth = { month: number; precipMedianMm: number | null; et0MedianMm: number | null; balanceMedianMm: number | null; validYears: number; expectedYears: number; coveragePct: number };
export type HistoricalCalendarDay = { month: number; day: number; tmeanMedianC: number | null; precipMedianMm: number | null; imergPrecipMedianMm: number | null; rootZoneWetnessMedian: number | null; validYears: number; expectedYears: number };

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const center = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? Number(((sorted[center - 1] + sorted[center]) / 2).toFixed(2)) : Number(sorted[center].toFixed(2));
}

export function monthlyClimatology(daily: ClimateDay[]): MonthlyClimateSummary[] {
  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const values = daily.filter((day) => Number(day.date.slice(4, 6)) === month);
    const temperatures = values.flatMap((day) => day.tmeanC === null ? [] : [day.tmeanC]);
    const minimums = values.flatMap((day) => day.tminC === null ? [] : [day.tminC]);
    const maximums = values.flatMap((day) => day.tmaxC === null ? [] : [day.tmaxC]);
    const precipitation = values.flatMap((day) => day.precipMm === null ? [] : [day.precipMm]);
    const solar = values.flatMap((day) => day.solarMjM2Day === null || day.solarMjM2Day === undefined ? [] : [day.solarMjM2Day]);
    const soil = values.flatMap((day) => day.soilTempC === null || day.soilTempC === undefined ? [] : [day.soilTempC]);
    return { month, tmeanMedianC: median(temperatures), tminMedianC: median(minimums), tmaxMedianC: median(maximums), tsoilMedianC: median(soil), precipMedianMm: median(precipitation), solarMedianMjM2Day: median(solar), validTemperatureDays: temperatures.length, validPrecipitationDays: precipitation.length };
  });
}

/** Same calendar day across complete historical years; this is climatology, not a current observation. */
export function historicalContextForCalendarDay(daily: ClimateDay[], month: number, day: number): HistoricalCalendarDay {
  const key = `${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`;
  const selected = daily.filter((item) => item.date.slice(4) === key);
  return {
    month,
    day,
    tmeanMedianC: median(selected.flatMap((item) => item.tmeanC === null ? [] : [item.tmeanC])),
    precipMedianMm: median(selected.flatMap((item) => item.precipMm === null ? [] : [item.precipMm])),
    imergPrecipMedianMm: median(selected.flatMap((item) => item.imergPrecipMm === null || item.imergPrecipMm === undefined ? [] : [item.imergPrecipMm])),
    rootZoneWetnessMedian: median(selected.flatMap((item) => item.rootZoneWetness === null || item.rootZoneWetness === undefined ? [] : [item.rootZoneWetness])),
    validYears: selected.filter((item) => item.tmeanC !== null && item.precipMm !== null).length,
    expectedYears: selected.length,
  };
}

/** IMERG rainfall timing and POWER root-zone wetness are observations/context, never crop demand or field measurements. */
export function historicalWaterContextForMonth(daily: ClimateDay[], month: number): HistoricalWaterContextMonth {
  const selected = daily.filter((day) => Number(day.date.slice(4, 6)) === month);
  const byYear = new Map<string, ClimateDay[]>();
  for (const day of selected) {
    const year = day.date.slice(0, 4);
    byYear.set(year, [...(byYear.get(year) ?? []), day]);
  }
  const completeYears = [...byYear.values()].flatMap((days) => {
    const values = days.map((day) => day.imergPrecipMm).filter((value): value is number => value !== null && value !== undefined);
    if (values.length !== days.length || days.length === 0) return [];
    return [{ total: values.reduce((sum, value) => sum + value, 0), rainDays: values.filter((value) => value > 0).length }];
  });
  const rootValues = selected.map((day) => day.rootZoneWetness).filter((value): value is number => value !== null && value !== undefined);
  const expectedDays = selected.length;
  const expectedYears = byYear.size;
  return {
    month,
    imergMedianTotalMm: median(completeYears.map((year) => year.total)),
    medianRainDays: median(completeYears.map((year) => year.rainDays)),
    rootZoneWetnessMedian: median(rootValues),
    validImergYears: completeYears.length,
    expectedYears,
    imergCoveragePct: expectedYears ? Number((completeYears.length / expectedYears * 100).toFixed(2)) : 0,
    rootZoneCoveragePct: expectedDays ? Number((rootValues.length / expectedDays * 100).toFixed(2)) : 0,
  };
}

export function precipitationForWindow(daily: ClimateDay[], start: string, end: string): { totalMm: number | null; validDays: number; expectedDays: number; coveragePct: number } {
  const selected = daily.filter((day) => day.date >= start && day.date <= end);
  const precipitation = selected.flatMap((day) => day.precipMm === null ? [] : [day.precipMm]);
  return { totalMm: precipitation.length ? Number(precipitation.reduce((sum, value) => sum + value, 0).toFixed(2)) : null, validDays: precipitation.length, expectedDays: selected.length, coveragePct: selected.length ? Number((precipitation.length / selected.length * 100).toFixed(2)) : 0 };
}

/** Historical monthly precipitation, not a crop water requirement. */
export function historicalPrecipitationForMonth(daily: ClimateDay[], month: number): HistoricalPrecipitationMonth {
  const byYear = new Map<string, ClimateDay[]>();
  for (const day of daily) {
    if (Number(day.date.slice(4, 6)) !== month) continue;
    const year = day.date.slice(0, 4);
    byYear.set(year, [...(byYear.get(year) ?? []), day]);
  }
  const completeTotals = [...byYear.values()].flatMap((days) => {
    const values = days.flatMap((day) => day.precipMm === null ? [] : [day.precipMm]);
    return values.length === days.length && days.length > 0 ? [values.reduce((sum, value) => sum + value, 0)] : [];
  });
  const expectedYears = byYear.size;
  return { month, medianTotalMm: median(completeTotals), validYears: completeTotals.length, expectedYears, coveragePct: expectedYears ? Number((completeTotals.length / expectedYears * 100).toFixed(2)) : 0 };
}

/** Complete monthly lookup used by exploratory month comparisons. */
export function historicalPrecipitationByMonth(daily: ClimateDay[]): HistoricalPrecipitationMonth[] {
  return Array.from({ length: 12 }, (_, index) => historicalPrecipitationForMonth(daily, index + 1));
}

/** Per month: for each year with every day carrying both precipitation and ET0, total P and ET0; then take medians across years. */
export function historicalWaterBalanceByMonth(daily: ClimateDay[]): WaterBalanceMonth[] {
  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const byYear = new Map<string, ClimateDay[]>();
    for (const day of daily) {
      if (Number(day.date.slice(4, 6)) !== month) continue;
      const year = day.date.slice(0, 4);
      byYear.set(year, [...(byYear.get(year) ?? []), day]);
    }
    const complete = [...byYear.values()].flatMap((days) => {
      if (days.length === 0 || days.some((day) => day.precipMm === null || day.et0Mm === null || day.et0Mm === undefined)) return [];
      const precip = days.reduce((sum, day) => sum + (day.precipMm as number), 0);
      const et0 = days.reduce((sum, day) => sum + (day.et0Mm as number), 0);
      return [{ precip, et0, balance: precip - et0 }];
    });
    const expectedYears = byYear.size;
    return { month, precipMedianMm: median(complete.map((year) => year.precip)), et0MedianMm: median(complete.map((year) => year.et0)), balanceMedianMm: median(complete.map((year) => year.balance)), validYears: complete.length, expectedYears, coveragePct: expectedYears ? Number((complete.length / expectedYears * 100).toFixed(2)) : 0 };
  });
}

export type YearMonth = { month: number; rainTotalMm: number | null; tmeanMedianC: number | null };
/** One calendar year, month by month, for comparison with the multi-year medians. A month with any missing day stays N/D: nothing is filled in. */
export function monthlyForYear(daily: ClimateDay[], year: number): YearMonth[] {
  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const days = daily.filter((day) => Number(day.date.slice(0, 4)) === year && Number(day.date.slice(4, 6)) === month);
    const rain = days.flatMap((day) => day.precipMm === null ? [] : [day.precipMm]);
    const temperature = days.flatMap((day) => day.tmeanC === null ? [] : [day.tmeanC]);
    const complete = (values: number[]) => days.length > 0 && values.length === days.length;
    return { month, rainTotalMm: complete(rain) ? Number(rain.reduce((sum, value) => sum + value, 0).toFixed(1)) : null, tmeanMedianC: complete(temperature) ? median(temperature) : null };
  });
}

/** Air-temperature (NASA POWER T2M_MIN) frost screen; 2 C is a screening threshold, crop-specific damage thresholds are not modelled. Years with any missing Tmin day are excluded, never filled in. */
export function frostByMonth(daily: ClimateDay[], thresholdC: number = FROST_SCREEN_THRESHOLD_C): FrostMonth[] {
  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const byYear = new Map<string, ClimateDay[]>();
    for (const day of daily) {
      if (Number(day.date.slice(4, 6)) !== month) continue;
      const year = day.date.slice(0, 4);
      byYear.set(year, [...(byYear.get(year) ?? []), day]);
    }
    const counts = [...byYear.values()].flatMap((days) => days.length > 0 && days.every((day) => day.tminC !== null) ? [days.filter((day) => (day.tminC as number) <= thresholdC).length] : []);
    const frostYears = counts.filter((count) => count > 0).length;
    return { month, thresholdC, frostYears, validYears: counts.length, expectedYears: byYear.size, frostYearShare: counts.length ? Number((frostYears / counts.length).toFixed(4)) : null, medianFrostDays: median(counts) };
  });
}

/** Month-by-month IMERG rain days and root-zone wetness context for every calendar month, from the series already loaded. */
export function historicalWaterContextByMonth(daily: ClimateDay[]): HistoricalWaterContextMonth[] {
  return Array.from({ length: 12 }, (_, index) => historicalWaterContextForMonth(daily, index + 1));
}
