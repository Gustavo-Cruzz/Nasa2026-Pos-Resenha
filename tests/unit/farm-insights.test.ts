import { describe, expect, it } from 'vitest';
import { monthRangeShort, monthlyRainSeries, rainNext7, rainWeekLevel, rainWeekSentence, periodText } from '@/lib/farm/insights';

describe('farm insights helpers', () => {
  it('sums the next 7 forecast days and ignores days beyond', () => {
    const days = Array.from({ length: 10 }, () => ({ precipitationMm: 2 }));
    expect(rainNext7(days)).toMatchObject({ totalMm: 14, knownDays: 7 });
    expect(rainNext7(days).series).toHaveLength(7);
  });
  it('keeps null days unknown and returns null total when all are unknown', () => {
    expect(rainNext7([{ precipitationMm: null }, { precipitationMm: 4 }])).toEqual({ series: [null, 4], totalMm: 4, knownDays: 1 });
    expect(rainNext7([{ precipitationMm: null }]).totalMm).toBeNull();
    expect(rainNext7([]).totalMm).toBeNull();
  });
  it('builds 12 monthly values with null for missing months', () => {
    const series = monthlyRainSeries([{ month: 1, medianTotalMm: 200 }, { month: 3, medianTotalMm: null }]);
    expect(series).toHaveLength(12);
    expect(series[0]).toBe(200);
    expect(series[2]).toBeNull();
    expect(series[11]).toBeNull();
  });
  it('formats month ranges in both languages', () => {
    expect(monthRangeShort(10, 3, 'pt-BR')).toBe('out → mar');
    expect(monthRangeShort(10, 3, 'en')).toBe('Oct → Mar');
  });
  it('describes the week level without prescriptions', () => {
    expect(rainWeekLevel(0)).toBe('almost_none');
    expect(rainWeekLevel(10)).toBe('light');
    expect(rainWeekLevel(40)).toBe('moderate');
    expect(rainWeekLevel(80)).toBe('heavy');
    expect(rainWeekSentence(42.4, 'pt-BR')).toContain('42 mm');
    expect(rainWeekSentence(42.4, 'en')).toContain('42 mm');
  });
  it('joins a period', () => {
    expect(periodText('2023-10', '2024-03', (v) => v)).toBe('2023-10 → 2024-03');
  });
});
