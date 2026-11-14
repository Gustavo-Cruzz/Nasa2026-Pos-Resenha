import type { ClimateDay } from '@/lib/climate/nasa-power';
import type { WaterBalanceMonth } from '@/lib/climate/indicators';
import { DRY_SPELL_DEFINITION } from '@/lib/climate/dry-spell';

/**
 * Historical seasonality computed from the NASA POWER daily series already loaded for the point.
 * Climate context only: it describes what happened in 2011–2025, it is not a forecast and it says nothing about a crop or a field.
 */

export type RainySeason = {
  /** Method label shown with the result: months where median precipitation exceeds median FAO-56 reference ET0. */
  method: 'positive_water_balance';
  startMonth: number;
  endMonth: number;
  months: number[];
  lengthMonths: number;
};

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const center = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[center - 1] + sorted[center]) / 2 : sorted[center];
}

/**
 * Longest circular run of months whose median precipitation minus median ET0 is positive.
 * Months without a balance (null) break a run. Ties go to the run with the larger summed surplus.
 */
export function rainySeasonFromBalance(balance: WaterBalanceMonth[]): RainySeason | null {
  const positive = Array.from({ length: 12 }, (_, index) => {
    const item = balance.find((entry) => entry.month === index + 1);
    return item?.balanceMedianMm !== null && item?.balanceMedianMm !== undefined && item.balanceMedianMm > 0;
  });
  if (!positive.some(Boolean)) return null;
  const surplus = (month: number) => balance.find((entry) => entry.month === month)?.balanceMedianMm ?? 0;
  if (positive.every(Boolean)) return { method: 'positive_water_balance', startMonth: 1, endMonth: 12, months: Array.from({ length: 12 }, (_, index) => index + 1), lengthMonths: 12 };
  // Start at a month that is positive after a non-positive month, so every run is counted once and never cut at the year boundary.
  let best: { months: number[]; total: number } | null = null;
  for (let index = 0; index < 12; index += 1) {
    if (!positive[index] || positive[(index + 11) % 12]) continue;
    const months: number[] = [];
    for (let step = 0; step < 12 && positive[(index + step) % 12]; step += 1) months.push(((index + step) % 12) + 1);
    const total = months.reduce((sum, month) => sum + surplus(month), 0);
    if (!best || months.length > best.months.length || (months.length === best.months.length && total > best.total)) best = { months, total };
  }
  if (!best) return null;
  return { method: 'positive_water_balance', startMonth: best.months[0], endMonth: best.months[best.months.length - 1], months: best.months, lengthMonths: best.months.length };
}

export type DrySpellSummary = {
  definition: { consecutiveDays: number; precipitationBelowMm: number };
  seasonsAnalyzed: number;
  seasonsWithSpell: number;
  medianLongestRunDays: number | null;
  maxRunDays: number | null;
  /** First calendar year of the season where the longest run happened (a Nov–Apr season is labelled by its November). */
  maxRunSeasonStartYear: number | null;
};

const daysInMonth = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();

/**
 * Longest run of consecutive days below the dry threshold inside the rainy-season months, per complete season.
 * A season counts only when every one of its days carries a precipitation value: nothing is filled in.
 * A season that wraps the new year (for example Nov–Apr) is labelled by the year it starts.
 */
export function drySpellsInRainySeason(daily: ClimateDay[], season: Pick<RainySeason, 'months' | 'startMonth' | 'endMonth'> | null): DrySpellSummary | null {
  if (!season) return null;
  const { consecutiveDays, precipitationBelowMm } = DRY_SPELL_DEFINITION;
  const wraps = season.startMonth > season.endMonth;
  const inSeason = new Set(season.months);
  const bySeason = new Map<number, ClimateDay[]>();
  for (const day of daily) {
    const year = Number(day.date.slice(0, 4)); const month = Number(day.date.slice(4, 6));
    if (!inSeason.has(month)) continue;
    const startYear = wraps && month <= season.endMonth ? year - 1 : year;
    bySeason.set(startYear, [...(bySeason.get(startYear) ?? []), day]);
  }
  const longest: Array<{ startYear: number; run: number }> = [];
  for (const [startYear, days] of bySeason) {
    const expected = season.months.reduce((sum, month) => sum + daysInMonth(wraps && month <= season.endMonth ? startYear + 1 : startYear, month), 0);
    if (days.length !== expected || days.some((day) => day.precipMm === null)) continue;
    const ordered = [...days].sort((a, b) => a.date.localeCompare(b.date));
    let run = 0; let best = 0;
    for (const day of ordered) { run = (day.precipMm as number) < precipitationBelowMm ? run + 1 : 0; best = Math.max(best, run); }
    longest.push({ startYear, run: best });
  }
  if (!longest.length) return { definition: { consecutiveDays, precipitationBelowMm }, seasonsAnalyzed: 0, seasonsWithSpell: 0, medianLongestRunDays: null, maxRunDays: null, maxRunSeasonStartYear: null };
  const top = longest.reduce((best, item) => item.run > best.run ? item : best, longest[0]);
  return {
    definition: { consecutiveDays, precipitationBelowMm },
    seasonsAnalyzed: longest.length,
    seasonsWithSpell: longest.filter((item) => item.run >= consecutiveDays).length,
    medianLongestRunDays: median(longest.map((item) => item.run)),
    maxRunDays: top.run,
    maxRunSeasonStartYear: top.startYear,
  };
}

export type RootZoneMonth = { month: number; medianWetness: number | null; lastYearWetness: number | null };

/**
 * POWER root-zone soil wetness (GWETROOT, 0–1): mean per year-month, then the median across years, next to the last year of the window.
 * A year-month with any missing day is skipped. Modelled value for the grid cell, not a field measurement.
 */
export function rootZoneByMonth(daily: ClimateDay[], lastYear: number): RootZoneMonth[] {
  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const byYear = new Map<number, ClimateDay[]>();
    for (const day of daily) {
      if (Number(day.date.slice(4, 6)) !== month) continue;
      const year = Number(day.date.slice(0, 4));
      byYear.set(year, [...(byYear.get(year) ?? []), day]);
    }
    const means = new Map<number, number>();
    for (const [year, days] of byYear) {
      const values = days.flatMap((day) => day.rootZoneWetness === null || day.rootZoneWetness === undefined ? [] : [day.rootZoneWetness]);
      if (days.length > 0 && values.length === days.length) means.set(year, values.reduce((sum, value) => sum + value, 0) / values.length);
    }
    const round = (value: number | null) => value === null ? null : Number(value.toFixed(2));
    return { month, medianWetness: round(median([...means.values()])), lastYearWetness: round(means.get(lastYear) ?? null) };
  });
}
