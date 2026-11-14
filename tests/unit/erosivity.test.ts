import { describe, expect, it } from 'vitest';
import { erosivityClass, erosivityLabel, historicalErosivity, modifiedFournierIndex } from '@/lib/climate/erosivity';
import type { ClimateDay } from '@/lib/climate/nasa-power';

const day = (date: string, precipMm: number | null): ClimateDay => ({ date, tmeanC: 20, tmaxC: 25, tminC: 15, precipMm, rhPct: 60, windMps: 2, solarMjM2Day: 18 });
/** One year of daily data with the given monthly totals spread evenly over each month's days (non-leap). */
const year = (y: number, monthly: number[], nullDate?: string): ClimateDay[] => monthly.flatMap((total, index) => {
  const days = new Date(Date.UTC(y, index + 1, 0)).getUTCDate();
  return Array.from({ length: days }, (_, offset) => { const date = `${y}${String(index + 1).padStart(2, '0')}${String(offset + 1).padStart(2, '0')}`; return day(date, date === nullDate ? null : total / days); });
});

describe('Modified Fournier Index', () => {
  it('matches the formula sum(p^2)/P', () => {
    expect(modifiedFournierIndex(Array(12).fill(100))).toBeCloseTo(100, 10);
    expect(modifiedFournierIndex([1200, ...Array(11).fill(0)])).toBeCloseTo(1200, 10);
    expect(modifiedFournierIndex([30, 20, ...Array(10).fill(10)])).toBeCloseTo((900 + 400 + 1000) / 150, 10);
  });
  it('rejects impossible input instead of guessing', () => {
    expect(modifiedFournierIndex(Array(11).fill(10))).toBeNull();
    expect(modifiedFournierIndex(Array(12).fill(0))).toBeNull();
    expect(modifiedFournierIndex([...Array(11).fill(10), -1])).toBeNull();
    expect(modifiedFournierIndex([...Array(11).fill(10), Number.NaN])).toBeNull();
  });
  it('uses the Arnoldus class limits', () => {
    expect([0, 59.9, 60, 89.9, 90, 119.9, 120, 159.9, 160, 400].map(erosivityClass)).toEqual(['very_low', 'very_low', 'low', 'low', 'moderate', 'moderate', 'severe', 'severe', 'very_severe', 'very_severe']);
    expect(erosivityLabel('severe', 'pt-BR')).toBe('severa');
    expect(erosivityLabel('very_low', 'en')).toBe('very low');
  });
});

describe('historical erosivity', () => {
  it('takes the median over complete years and drops years with a missing day', () => {
    const even = Array(12).fill(100); // MFI 100
    const seasonal = [300, 250, 200, 100, 50, 0, 0, 0, 50, 100, 200, 250]; // sum 1500
    const daily = [...year(2020, even), ...year(2021, seasonal), ...year(2022, even, '20220615')];
    const result = historicalErosivity(daily);
    const seasonalMfi = seasonal.reduce((sum, value) => sum + value * value, 0) / 1500;
    expect(result.validYears).toBe(2);
    expect(result.expectedYears).toBe(3);
    expect(result.coveragePct).toBe(66.67);
    expect(result.mfi).toBeCloseTo((100 + seasonalMfi) / 2, 0);
  });
  it('is N/D without any complete year', () => {
    expect(historicalErosivity([])).toEqual({ mfi: null, classId: null, validYears: 0, expectedYears: 0, coveragePct: 0 });
    expect(historicalErosivity(year(2020, Array(12).fill(100), '20200301'))).toMatchObject({ mfi: null, classId: null, validYears: 0 });
  });
});
