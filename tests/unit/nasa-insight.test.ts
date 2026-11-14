import { describe, expect, it } from 'vitest';
import { analyze } from '@/lib/engine';
import type { ClimateContext } from '@/lib/climate/nasa-power';
import type { AnalysisInput } from '@/lib/schema';
import { createLabPlan } from '@/lib/lab';

const input: AnalysisInput = { location: { latitude: -17.798, longitude: -50.919 }, plantingMonth: 4, history: [{ cropId: 'soybean', startYearMonth: '2023-01', endYearMonth: '2023-06' }, { cropId: 'maize', startYearMonth: '2023-07', endYearMonth: '2023-12' }, { cropId: 'soybean', startYearMonth: '2024-01', endYearMonth: '2024-06' }], priorities: { water: 3, soil: 2, operations: 1 }, irrigation: 'unknown', futureBaseline: { cropId: 'soybean', confirmed: true } };
const monthly = Array.from({ length: 12 }, (_, index) => ({ month: index + 1, tmeanMedianC: index === 3 ? 35 : index === 5 ? null : 25, precipMedianMm: 2, validTemperatureDays: 400, validPrecipitationDays: 400 }));
const historicalPrecipitationByMonth = Array.from({ length: 12 }, (_, index) => ({ month: index + 1, medianTotalMm: 100 + index, validYears: 15, expectedYears: 15, coveragePct: 100 }));
const climate: ClimateContext = { status: 'available', origin: 'live', monthly, plantingMonthPrecipitation: historicalPrecipitationByMonth[3], historicalPrecipitationByMonth, provenance: { source: 'NASA_POWER', requestedCoordinates: input.location, period: { start: '20110101', end: '20251231' }, fetchedAt: '2026-11-12T00:00:00.000Z', rawParameterNames: ['T2M', 'PRECTOTCORR'], sourceUrl: 'https://power.larc.nasa.gov/example', timezone: 'UTC', coveragePct: { T2M: 100, T2M_MAX: 100, T2M_MIN: 100, PRECTOTCORR: 100, RH2M: 100, WS2M: 100, ALLSKY_SFC_SW_DWN: 100 }, missingDays: [], warnings: [] }, gaps: [] };

describe('NASA causal insight', () => {
  it('traces one NASA observation through documented thermal rules without changing crops', () => {
    const result = analyze(input, climate);
    expect(result.nasaInsight.status).toBe('contrast');
    expect(result.nasaInsight.observedValue).toBe(35);
    expect(result.nasaInsight.effects.map((effect) => effect.state)).toEqual(['attention', 'compatible', 'attention']);
    expect(result.nasaInsight.attentionDecision).toMatchObject({ scenarioId: 'A', observedValue: 35, ruleId: 'DOCUMENTED_THERMAL_RANGE' });
    expect(result.nasaInsight.effects.every((effect) => effect.sourceRefs.some((source) => source.includes('power.larc.nasa.gov')))).toBe(true);
    expect(result.nasaInsightByMonth).toHaveLength(12);
    expect(result.strategies.map((strategy) => strategy.proposedCrop?.cropId)).toEqual(['soybean', 'sorghum', 'maize']);
  });

  it('keeps precipitation observational when thermal evidence is absent', () => {
    const plan = createLabPlan(input, ['common_bean', 'upland_rice', 'ruziziensis']);
    const result = analyze(input, climate, plan);
    expect(result.nasaInsight.status).toBe('observational');
    expect(result.nasaInsight.metric).toBe('precipitation');
    expect(result.nasaInsight.changesComparison).toBe(false);
    expect(result.nasaInsight.attentionDecision).toBeNull();
    expect(result.nasaInsight.limitations[0]).toMatch(/não representa demanda hídrica/i);
  });

  it('keeps all effects unknown when NASA is unavailable', () => {
    const result = analyze(input, { status: 'unavailable', origin: 'unavailable', monthly: [], plantingMonthPrecipitation: null, historicalPrecipitationByMonth: [], provenance: null, gaps: ['NASA down'] });
    expect(result.nasaInsight.status).toBe('unknown');
    expect(result.nasaInsight.effects.every((effect) => effect.state === 'unknown')).toBe(true);
    expect(result.nasaInsight.attentionDecision).toBeNull();
  });
});
