import { describe, expect, it } from 'vitest';
import { analysisMatchesDraft } from '@/lib/analysis-cache';
import { analysisInputSchema } from '@/lib/schema';
import type { AnalysisResult } from '@/lib/engine/types';
import type { LabPlan } from '@/lib/lab';

const input = analysisInputSchema.parse({ location: { latitude: -17.798, longitude: -50.919 }, plantingMonth: 4, history: [{ cropId: 'soybean', startYearMonth: '2025-01', endYearMonth: '2025-06' }], priorities: { water: 1, soil: 1, operations: 1 }, irrigation: 'unknown' });
const plan: LabPlan = { scenarios: (['A', 'B', 'C'] as const).map((id) => ({ id, title: id, slots: [{ year: 1, season: 'A', cropId: id === 'A' ? 'maize' : null }, { year: 1, season: 'B', cropId: null }, { year: 2, season: 'A', cropId: null }, { year: 2, season: 'B', cropId: null }] })) };
const result = { input, strategies: plan.scenarios.map((scenario) => ({ id: scenario.id, slots: scenario.slots.map((slot, slotIndex) => ({ slotIndex, cropId: slot.cropId })) })) } as unknown as AnalysisResult;

describe('analysis cache compatibility', () => {
  it('requires the same validated input and the same four lab slots', () => {
    expect(analysisMatchesDraft(result, input, plan)).toBe(true);
    expect(analysisMatchesDraft(result, { ...input, plantingMonth: 5 }, plan)).toBe(false);
    const changed: LabPlan = { ...plan, scenarios: plan.scenarios.map((scenario) => scenario.id === 'A' ? { ...scenario, slots: scenario.slots.map((slot, index) => index === 0 ? { ...slot, cropId: 'sunflower' } : slot) } : scenario) };
    expect(analysisMatchesDraft(result, input, changed)).toBe(false);
  });
});
