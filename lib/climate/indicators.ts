import type { ClimateDay } from '@/lib/climate/nasa-power';

export type MonthlyClimateSummary = { month: number; tmeanMedianC: number | null; tminMedianC?: number | null; tmaxMedianC?: number | null; precipMedianMm: number | null; validTemperatureDays: number; validPrecipitationDays: number };
export type HistoricalPrecipitationMonth = { month: number; medianTotalMm: number | null; validYears: number; expectedYears: number; coveragePct: number };
export type HistoricalWaterContextMonth = { month: number; imergMedianTotalMm: number | null; medianRainDays: number | null; rootZoneWetnessMedian: number | null; validImergYears: number; expectedYears: number; imergCoveragePct: number; rootZoneCoveragePct: number };

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
    return { month, tmeanMedianC: median(temperatures), tminMedianC: median(minimums), tmaxMedianC: median(maximums), precipMedianMm: median(precipitation), validTemperatureDays: temperatures.length, validPrecipitationDays: precipitation.length };
  });
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
