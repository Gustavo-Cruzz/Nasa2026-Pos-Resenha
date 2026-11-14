import { describe, expect, it } from 'vitest';
import { analyze } from '@/lib/engine';
import { applyRainChange, deriveRotationCalendar, deriveSeasonInsights, describeSeasonInsight, formatMonths, seasonCaveat } from '@/lib/engine/season';
import type { ClimateContext } from '@/lib/climate/nasa-power';
import type { WaterBalanceMonth } from '@/lib/climate/indicators';
import type { AnalysisInput } from '@/lib/schema';

const input: AnalysisInput = { location: { latitude: -17.798, longitude: -50.919 }, plantingMonth: 4, history: [{ cropId: 'soybean', startYearMonth: '2023-01', endYearMonth: '2023-06' }, { cropId: 'maize', startYearMonth: '2023-07', endYearMonth: '2023-12' }, { cropId: 'soybean', startYearMonth: '2024-01', endYearMonth: '2024-06' }], priorities: { water: 3, soil: 2, operations: 1 }, irrigation: 'unknown', futureBaseline: { cropId: 'soybean', confirmed: true } };
const rain = Array.from({ length: 12 }, (_, index) => ({ month: index + 1, medianTotalMm: 100 + index, validYears: 15, expectedYears: 15, coveragePct: 100 }));
const climate = (monthlyTemp: (month: number) => number | null): ClimateContext => ({ status: 'available', origin: 'live', monthly: Array.from({ length: 12 }, (_, index) => ({ month: index + 1, tmeanMedianC: monthlyTemp(index + 1), precipMedianMm: 2, validTemperatureDays: 400, validPrecipitationDays: 400 })), plantingMonthPrecipitation: rain[3], historicalPrecipitationByMonth: rain, provenance: { source: 'NASA_POWER', requestedCoordinates: input.location, period: { start: '20110101', end: '20251231' }, fetchedAt: '2026-11-12T00:00:00.000Z', rawParameterNames: ['T2M'], sourceUrl: 'https://power.larc.nasa.gov/example', timezone: 'UTC', coveragePct: { T2M: 100, T2M_MAX: 100, T2M_MIN: 100, PRECTOTCORR: 100, RH2M: 100, WS2M: 100, ALLSKY_SFC_SW_DWN: 100 }, missingDays: [], warnings: [] }, gaps: [] });
const balance = (values: Array<number | null>): WaterBalanceMonth[] => values.map((value, index) => ({ month: index + 1, precipMedianMm: value === null ? null : 50 + value, et0MedianMm: value === null ? null : 50, balanceMedianMm: value, validYears: value === null ? 0 : 15, expectedYears: 15, coveragePct: value === null ? 0 : 100 }));
const insightsOf = (temp: (month: number) => number | null) => analyze(input, climate(temp)).nasaInsightByMonth;

describe('rotation calendar', () => {
  it('computes states and signed thermal margins from documented ranges', () => {
    const rows = deriveRotationCalendar(insightsOf((month) => month === 4 ? 35 : 25));
    expect(rows.map((row) => row.scenarioId)).toEqual(['A', 'B', 'C']);
    const april = rows.map((row) => row.cells[3]);
    expect(april.map((cell) => cell.state)).toEqual(['attention', 'compatible', 'attention']);
    expect(april.map((cell) => cell.marginC)).toEqual([-5, 3, -5]);
    expect(rows[0].cells[0]).toMatchObject({ state: 'compatible', marginC: 5, valueC: 25 });
  });
  it('shifts every month by a hypothetical offset without mutating the history', () => {
    const insights = insightsOf(() => 25);
    expect(deriveRotationCalendar(insights, 6).map((row) => row.cells[0].state)).toEqual(['attention', 'compatible', 'attention']);
    expect(deriveRotationCalendar(insights, 0).every((row) => row.cells.every((cell) => cell.state === 'compatible'))).toBe(true);
  });
  it('keeps months without a reading unknown, never compatible', () => {
    const rows = deriveRotationCalendar(insightsOf((month) => month === 6 ? null : 25));
    expect(rows.every((row) => row.cells[5].state === 'unknown' && row.cells[5].marginC === null)).toBe(true);
  });
  it('is empty without insights', () => expect(deriveRotationCalendar([])).toEqual([]));
});

describe('season insights', () => {
  it('reports thermal contrast with values, ranges and the diverging hypotheses', () => {
    const calendar = deriveRotationCalendar(insightsOf((month) => month === 4 ? 35 : 25));
    const insights = deriveSeasonInsights(calendar, balance(Array(12).fill(10)), 4);
    expect(insights[0]).toMatchObject({ kind: 'thermal_contrast', month: 4, valueC: 35 });
    const text = describeSeasonInsight(insights[0], 'pt-BR');
    expect(text.title).toContain('abr');
    expect(text.detail).toContain('35');
    expect(text.detail).toContain('20–30 °C');
    expect(describeSeasonInsight(insights[0], 'en').title).toContain('Apr');
  });
  it('falls back to the smallest thermal margin when no hypothesis diverges', () => {
    const calendar = deriveRotationCalendar(insightsOf(() => 25));
    const lead = deriveSeasonInsights(calendar, [], 4)[0];
    expect(lead.kind).toBe('thermal_margin');
    if (lead.kind === 'thermal_margin') {
      expect(lead.tightest).toMatchObject({ scenarioId: 'A', marginC: 5 });
      expect(lead.roomiest).toMatchObject({ scenarioId: 'B', marginC: 9 });
    }
  });
  it('flags months with a climate water deficit and ignores low-coverage balances', () => {
    const calendar = deriveRotationCalendar(insightsOf(() => 25));
    const values = [50, 30, 10, -20, -60, -80, -120, -150, -100, -40, 20, 40];
    const deficit = deriveSeasonInsights(calendar, balance(values), 4).find((item) => item.kind === 'water_deficit');
    expect(deficit).toMatchObject({ kind: 'water_deficit', months: [4, 5, 6, 7, 8, 9, 10], worstMonth: 8, worstBalanceMm: -150, plantingMonthBalanceMm: -20 });
    const weak = balance(values).map((month) => ({ ...month, coveragePct: 40 }));
    expect(deriveSeasonInsights(calendar, weak, 4).some((item) => item.kind === 'water_deficit')).toBe(false);
    expect(deriveSeasonInsights(calendar, balance(Array(12).fill(null)), 4).some((item) => item.kind === 'water_deficit')).toBe(false);
  });
  it('says N/D when there is nothing to compare', () => {
    const none = analyze(input, { status: 'unavailable', origin: 'unavailable', monthly: [], plantingMonthPrecipitation: null, historicalPrecipitationByMonth: [], provenance: null, gaps: [] }).nasaInsightByMonth;
    const lead = deriveSeasonInsights(deriveRotationCalendar(none), [], 4)[0];
    expect(lead).toEqual({ kind: 'no_reading', reason: 'climate' });
    expect(describeSeasonInsight(lead, 'pt-BR').detail).toContain('N/D');
  });
  it('never claims forecast or recommendation without a caveat', () => {
    expect(seasonCaveat('pt-BR')).toMatch(/não é previsão/);
    expect(seasonCaveat('en')).toMatch(/not a forecast/);
  });
  it('formats consecutive months as ranges', () => {
    expect(formatMonths([5, 6, 7, 8, 12, 1], 'pt-BR')).toBe('jan, mai–ago, dez');
  });
});

describe('hypothetical rainfall change', () => {
  it('rescales precipitation, keeps ET0 fixed and leaves missing values null', () => {
    const base = balance([100, null]);
    const wetter = applyRainChange(base, 10);
    expect(wetter[0]).toMatchObject({ precipMedianMm: 165, et0MedianMm: 50, balanceMedianMm: 115 });
    expect(wetter[1]).toEqual(base[1]);
    expect(applyRainChange(base, 0)).toBe(base);
    expect(applyRainChange(base, -30)[0]).toMatchObject({ precipMedianMm: 105, balanceMedianMm: 55 });
  });
});
