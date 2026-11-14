import type { ClimateDay } from '@/lib/climate/nasa-power';

/**
 * Arnoldus (1980) Modified Fournier Index, MFI = sum(p_i^2) / P over the 12 monthly totals (mm) of a year, and the erosivity
 * classes quoted from Arnoldus/CEC (1992) by Khentouche & Bella, Acta Geographica Lodziensia: (0-60) very low, (60-90) low,
 * (90-120) moderate, (120-160) severe, (>160) very severe. It is a rainfall aggressiveness index, not soil loss.
 */
export type ErosivityClassId = 'very_low' | 'low' | 'moderate' | 'severe' | 'very_severe';
export type Erosivity = { mfi: number | null; classId: ErosivityClassId | null; validYears: number; expectedYears: number; coveragePct: number };

export function erosivityClass(mfi: number): ErosivityClassId {
  return mfi < 60 ? 'very_low' : mfi < 90 ? 'low' : mfi < 120 ? 'moderate' : mfi < 160 ? 'severe' : 'very_severe';
}
const labels = { 'pt-BR': { very_low: 'muito baixa', low: 'baixa', moderate: 'moderada', severe: 'severa', very_severe: 'muito severa' }, en: { very_low: 'very low', low: 'low', moderate: 'moderate', severe: 'severe', very_severe: 'very severe' } } as const;
export const erosivityLabel = (id: ErosivityClassId, locale: 'pt-BR' | 'en') => labels[locale][id];

export function modifiedFournierIndex(monthlyTotalsMm: number[]): number | null {
  if (monthlyTotalsMm.length !== 12 || monthlyTotalsMm.some((value) => !Number.isFinite(value) || value < 0)) return null;
  const annual = monthlyTotalsMm.reduce((sum, value) => sum + value, 0);
  return annual > 0 ? monthlyTotalsMm.reduce((sum, value) => sum + value * value, 0) / annual : null;
}

/** Median of the yearly MFI over years in which every day of every month has a precipitation value. */
export function historicalErosivity(daily: ClimateDay[]): Erosivity {
  const byYear = new Map<string, ClimateDay[]>();
  for (const day of daily) byYear.set(day.date.slice(0, 4), [...(byYear.get(day.date.slice(0, 4)) ?? []), day]);
  const values = [...byYear.values()].flatMap((days) => {
    if (days.some((day) => day.precipMm === null)) return [];
    const totals = Array.from({ length: 12 }, (_, index) => days.filter((day) => Number(day.date.slice(4, 6)) === index + 1).reduce((sum, day) => sum + (day.precipMm as number), 0));
    const mfi = modifiedFournierIndex(totals);
    return mfi === null ? [] : [mfi];
  }).sort((a, b) => a - b);
  const expectedYears = byYear.size;
  const mid = Math.floor(values.length / 2);
  const median = values.length ? (values.length % 2 ? values[mid] : (values[mid - 1] + values[mid]) / 2) : null;
  const mfi = median === null ? null : Number(median.toFixed(1));
  return { mfi, classId: mfi === null ? null : erosivityClass(mfi), validYears: values.length, expectedYears, coveragePct: expectedYears ? Number((values.length / expectedYears * 100).toFixed(2)) : 0 };
}
