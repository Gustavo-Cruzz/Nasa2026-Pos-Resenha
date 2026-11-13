import { describe, expect, it } from 'vitest';
import { analyze } from '@/lib/engine';
import { changeLabSlot, createLabPlan } from '@/lib/lab';
import { assessLabPlan } from '@/lib/lab/assessment';
import { diffLabSlot } from '@/lib/lab/diff';
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
    expect(result.strategies[1]?.slots).toHaveLength(4);
    expect(result.strategies[1]?.configuredSlots).toBe(2);
    expect(result.strategies[1]?.missingData).toContain('unconfigured_lab_slots');
    expect('score' in result.strategies[1]!).toBe(false);
  });
  it('evaluates each slot against only its immediate predecessor and preserves gaps', () => {
    let plan = createLabPlan(base, ['soybean', 'sorghum', 'cowpea']);
    plan = changeLabSlot(plan, 'B', 2, 'cowpea');
    const slots = assessLabPlan(base, plan, unavailable).filter((slot) => slot.scenarioId === 'B');
    expect(slots[0].previousCropId).toBe('soybean');
    expect(slots[0].indicators.find((item) => item.id === 'functional_diversity')?.state).toBe('compatible');
    expect(slots[2].previousCropId).toBeNull();
    expect(slots[2].indicators.find((item) => item.id === 'functional_diversity')?.state).toBe('unknown');
  });
  it('returns an honest before/after delta without calling changes improvements', () => {
    const beforePlan = createLabPlan(base, ['soybean', 'sorghum', 'cowpea']);
    const afterPlan = changeLabSlot(beforePlan, 'B', 1, 'cowpea');
    const before = assessLabPlan(base, beforePlan, unavailable).find((slot) => slot.scenarioId === 'B' && slot.slotIndex === 1)!;
    const after = assessLabPlan(base, afterPlan, unavailable).find((slot) => slot.scenarioId === 'B' && slot.slotIndex === 1)!;
    const delta = diffLabSlot(before, after);
    expect(delta.nextCropId).toBe('cowpea');
    expect(delta.changes.some((change) => change.indicator === 'cover_potential' && change.before === 'unknown' && change.after === 'yes')).toBe(true);
    expect(JSON.stringify(delta)).not.toMatch(/improved|worse|score/i);
  });
});
