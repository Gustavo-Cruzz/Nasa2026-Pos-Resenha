import { describe, expect, it } from 'vitest';
import type { ClimateDay } from '@/lib/climate/nasa-power';
import type { WaterBalanceMonth } from '@/lib/climate/indicators';
import { drySpellsInRainySeason, rainySeasonFromBalance, rootZoneByMonth } from '@/lib/climate/seasonality';
import { classifyEnso, ensoStateFromReadings, parseRoni, seasonMonths } from '@/lib/climate/enso';

const balance = (values: Array<number | null>): WaterBalanceMonth[] => values.map((balanceMedianMm, index) => ({ month: index + 1, precipMedianMm: null, et0MedianMm: null, balanceMedianMm, validYears: 15, expectedYears: 15, coveragePct: 100 }));
const day = (date: string, precipMm: number | null, rootZoneWetness: number | null = null): ClimateDay => ({ date, tmeanC: 25, tmaxC: 30, tminC: 20, precipMm, rhPct: 60, windMps: 2, solarMjM2Day: 20, rootZoneWetness });

describe('rainySeasonFromBalance', () => {
  it('finds a season that wraps the new year', () => {
    const season = rainySeasonFromBalance(balance([80, 60, 30, -10, -50, -70, -80, -80, -60, -20, 40, 90]));
    expect(season).toMatchObject({ startMonth: 11, endMonth: 3, months: [11, 12, 1, 2, 3], lengthMonths: 5 });
  });
  it('picks the longest run when there are two', () => {
    const season = rainySeasonFromBalance(balance([10, -5, -5, 20, 30, 40, -5, -5, -5, -5, -5, -5]));
    expect(season).toMatchObject({ startMonth: 4, endMonth: 6 });
  });
  it('returns null when no month is positive and treats missing balances as breaks', () => {
    expect(rainySeasonFromBalance(balance(Array(12).fill(-10)))).toBeNull();
    expect(rainySeasonFromBalance(balance([5, 5, null, 5, -1, -1, -1, -1, -1, -1, -1, -1]))).toMatchObject({ startMonth: 1, endMonth: 2, lengthMonths: 2 });
  });
  it('reports a year-round surplus as all twelve months', () => {
    expect(rainySeasonFromBalance(balance(Array(12).fill(10)))).toMatchObject({ lengthMonths: 12, startMonth: 1, endMonth: 12 });
  });
});

function season(startYear: number, dryRunDays: number, missing = false): ClimateDay[] {
  const days: ClimateDay[] = [];
  for (const [year, month, count] of [[startYear, 11, 30], [startYear, 12, 31], [startYear + 1, 1, 31]] as const) {
    for (let d = 1; d <= count; d += 1) days.push(day(`${year}${String(month).padStart(2, '0')}${String(d).padStart(2, '0')}`, 5));
  }
  for (let i = 0; i < dryRunDays; i += 1) days[10 + i] = { ...days[10 + i], precipMm: 0 };
  if (missing) days[0] = { ...days[0], precipMm: null };
  return days;
}

describe('drySpellsInRainySeason', () => {
  const nov = { months: [11, 12, 1], startMonth: 11, endMonth: 1 };
  it('measures the longest dry run per complete season and ignores incomplete ones', () => {
    const daily = [...season(2015, 9), ...season(2016, 3), ...season(2017, 12, true)];
    const result = drySpellsInRainySeason(daily, nov)!;
    expect(result.seasonsAnalyzed).toBe(2);
    expect(result.maxRunDays).toBe(9);
    expect(result.maxRunSeasonStartYear).toBe(2015);
    expect(result.seasonsWithSpell).toBe(1);
    expect(result.medianLongestRunDays).toBe(6);
  });
  it('does not count a season cut by the edge of the series', () => {
    const result = drySpellsInRainySeason(season(2015, 8).slice(40), nov)!;
    expect(result.seasonsAnalyzed).toBe(0);
    expect(result.maxRunDays).toBeNull();
  });
  it('is null without a rainy season', () => { expect(drySpellsInRainySeason(season(2015, 8), null)).toBeNull(); });
});

describe('rootZoneByMonth', () => {
  it('takes the median of yearly means and skips a year-month with a missing day', () => {
    const days = (year: number, value: number | null, gap = false) => Array.from({ length: 31 }, (_, index) => day(`${year}0101`.slice(0, 6) + String(index + 1).padStart(2, '0'), 1, gap && index === 3 ? null : value));
    const result = rootZoneByMonth([...days(2020, 0.4), ...days(2021, 0.6), ...days(2022, 0.9, true)], 2021);
    expect(result[0]).toEqual({ month: 1, medianWetness: 0.5, lastYearWetness: 0.6 });
    expect(result[1]).toEqual({ month: 2, medianWetness: null, lastYearWetness: null });
  });
});

describe('ENSO / RONI', () => {
  const text = 'SEAS  YEAR  ANOM\nJJA  2026  1.36\nJAS  2026  1.69\nASO  2026  1.97\nnot a row\nXYZ  2026  9.99\n';
  it('parses only recognised season rows', () => { expect(parseRoni(text)).toEqual([{ season: 'JJA', year: 2026, value: 1.36 }, { season: 'JAS', year: 2026, value: 1.69 }, { season: 'ASO', year: 2026, value: 1.97 }]); });
  it('classifies phase and strength at the NOAA thresholds', () => {
    expect(classifyEnso(0.49)).toEqual({ phase: 'neutral', strength: null });
    expect(classifyEnso(0.5)).toEqual({ phase: 'el_nino', strength: 'weak' });
    expect(classifyEnso(1.97)).toEqual({ phase: 'el_nino', strength: 'strong' });
    expect(classifyEnso(2)).toEqual({ phase: 'el_nino', strength: 'very_strong' });
    expect(classifyEnso(-1.2)).toEqual({ phase: 'la_nina', strength: 'moderate' });
  });
  it('keeps the latest reading and up to three before it, and returns null for an empty table', () => {
    const state = ensoStateFromReadings(parseRoni(text))!;
    expect(state.latest.season).toBe('ASO');
    expect(state.previous).toHaveLength(2);
    expect(ensoStateFromReadings([])).toBeNull();
  });
  it('maps NOAA seasons to calendar months', () => { expect(seasonMonths('ASO')).toEqual([8, 10]); expect(seasonMonths('DJF')).toEqual([12, 2]); expect(seasonMonths('???')).toBeNull(); });
});
