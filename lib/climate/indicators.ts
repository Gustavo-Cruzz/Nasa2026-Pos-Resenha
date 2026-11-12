import type { ClimateDay } from '@/lib/climate/nasa-power';

export type MonthlyClimateSummary = { month: number; tmeanMedianC: number | null; precipMedianMm: number | null; validTemperatureDays: number; validPrecipitationDays: number };
export type HistoricalPrecipitationMonth = { month: number; medianTotalMm: number | null; validYears: number; expectedYears: number; coveragePct: number };

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const center = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? Number(((sorted[center - 1] + sorted[center]) / 2).toFixed(2)) : sorted[center];
}

export function monthlyClimatology(daily: ClimateDay[]): MonthlyClimateSummary[] {
  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const values = daily.filter((day) => Number(day.date.slice(4, 6)) === month);
    const temperatures = values.flatMap((day) => day.tmeanC === null ? [] : [day.tmeanC]);
    const precipitation = values.flatMap((day) => day.precipMm === null ? [] : [day.precipMm]);
    return { month, tmeanMedianC: median(temperatures), precipMedianMm: median(precipitation), validTemperatureDays: temperatures.length, validPrecipitationDays: precipitation.length };
  });
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
