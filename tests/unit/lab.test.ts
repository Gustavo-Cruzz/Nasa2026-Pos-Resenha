import { describe, expect, it } from 'vitest';
import { analyze } from '@/lib/engine';
import { changeLabSlot, createLabPlan } from '@/lib/lab';
import type { ClimateContext } from '@/lib/climate/nasa-power';
import type { AnalysisInput } from '@/lib/schema';

const base: AnalysisInput = { location: { latitude: -17.798, longitude: -50.919 }, plantingMonth: 4, history: [{ cropId: 'soybean', startYearMonth: '2023-01', endYearMonth: '2023-06' }, { cropId: 'maize', startYearMonth: '2023-07', endYearMonth: '2023-12' }, { cropId: 'soybean', startYearMonth: '2024-01', endYearMonth: '2024-06' }], priorities: { water: 1, soil: 1, operations: 1 }, irrigation: 'unknown' };
const unavailable: ClimateContext = { status: 'unavailable', origin: 'unavailable', monthly: [], plantingMonthPrecipitation: null, historicalPrecipitationByMonth: [], provenance: null, gaps: ['NASA down'] };

describe('laboratory plan', () => {
  it('creates three scenarios with two neutral years and no invented dates', () => {
    const plan = createLabPlan(base, ['soybean', 'sorghum', 'sorghum']);
    expect(plan.scenarios).toHaveLength(3);
    expect(plan.scenarios.every((item) => item.slots.length === 4)).toBe(true);
    expect(plan.scenarios[0]?.slots.slice(1).every((slot) => slot.cropId === null)).toBe(true);
  });
  it('changes a slot and reuses engine indicators without a score', () => {
    const plan = changeLabSlot(createLabPlan(base, ['soybean', 'sorghum', 'sorghum']), 'B', 1, 'cowpea');
    const result = analyze(base, unavailable, plan);
    expect(result.strategies[1]?.proposedCrop?.cropId).toBe('sorghum');
    expect(result.strategies[1]?.missingData).toContain('unconfigured_lab_slots');
    expect('score' in result.strategies[1]!).toBe(false);
  });
});
