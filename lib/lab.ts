import { z } from 'zod';
import type { AnalysisInput } from '@/lib/schema';
import { cropById, isAnnualRotationEligible } from '@/lib/catalog';
import { defaultLabSequences, type EngineStrategyLike } from '@/lib/lab/sequence';

export type LabCropId = string;
const slotSchema = z.object({ year: z.union([z.literal(1), z.literal(2)]), season: z.union([z.literal('A'), z.literal('B')]), cropId: z.string().nullable(), cycleContextConfirmed: z.boolean().optional() }).refine((slot) => !slot.cropId || (cropById.has(slot.cropId) && isAnnualRotationEligible(slot.cropId)), 'Annual rotation slots accept only catalogued annual-management crops.');
const scenarioSchema = z.object({ id: z.union([z.literal('A'), z.literal('B'), z.literal('C')]), title: z.string().min(1), slots: z.array(slotSchema).length(4) });
export const labPlanSchema = z.object({ scenarios: z.array(scenarioSchema).length(3) });
export type LabPlan = z.infer<typeof labPlanSchema>;
const slots = (cropId: LabCropId | null) => [{ year: 1 as const, season: 'A' as const, cropId }, { year: 1 as const, season: 'B' as const, cropId: null }, { year: 2 as const, season: 'A' as const, cropId: null }, { year: 2 as const, season: 'B' as const, cropId: null }];

/** Creates hypotheses from the existing engine's first prospective crop only. Empty slots remain unknown. */
export function createLabPlan(input: AnalysisInput, cropIds: Array<string | undefined>): LabPlan {
  const valid = (cropId: string | undefined): LabCropId | null => cropId && cropById.has(cropId) && isAnnualRotationEligible(cropId) ? cropId : null;
  return { scenarios: [
    { id: 'A', title: input.futureBaseline?.confirmed ? 'Cenário A — Meu plano' : 'Continuidade presumida — confirmar', slots: slots(valid(cropIds[0])) },
    { id: 'B', title: 'Cenário B — Foco na recuperação do solo', slots: slots(valid(cropIds[1])) },
    { id: 'C', title: 'Cenário C — Foco na conservação da água', slots: slots(valid(cropIds[2])) },
  ] };
}

const SLOT_KEYS = [[1, 'A'], [1, 'B'], [2, 'A'], [2, 'B']] as const;

/** Default plan with all four slots per scenario filled from detected history (null where crops are not permitted). */
export function createDefaultLabPlan(input: AnalysisInput, strategies: EngineStrategyLike[]): LabPlan {
  const sequences = defaultLabSequences(input, strategies.map((item) => item.proposedCrop?.cropId), strategies.map((item) => item.title));
  return { scenarios: sequences.map((sequence) => ({ id: sequence.id, title: sequence.title, slots: SLOT_KEYS.map(([year, season], index) => ({ year, season, cropId: sequence.cropIds[index] ?? null })) })) };
}

export function changeLabSlot(plan: LabPlan, scenarioId: 'A' | 'B' | 'C', slotIndex: number, cropId: LabCropId | null): LabPlan {
  return { scenarios: plan.scenarios.map((scenario) => scenario.id !== scenarioId ? scenario : { ...scenario, slots: scenario.slots.map((slot, index) => index === slotIndex ? { ...slot, cropId, cycleContextConfirmed: false } : slot) }) };
}

export function labPrimaryCrop(plan: LabPlan, scenarioId: 'A' | 'B' | 'C'): string | undefined { return plan.scenarios.find((item) => item.id === scenarioId)?.slots.find((slot) => slot.cropId)?.cropId ?? undefined; }
