import { z } from 'zod';
import type { AnalysisInput } from '@/lib/schema';

export const LAB_CROP_IDS = ['soybean', 'maize', 'sorghum', 'sunflower', 'cowpea', 'common_bean', 'upland_rice', 'ruziziensis'] as const;
export type LabCropId = typeof LAB_CROP_IDS[number];
const slotSchema = z.object({ year: z.union([z.literal(1), z.literal(2)]), season: z.union([z.literal('A'), z.literal('B')]), cropId: z.enum(LAB_CROP_IDS).nullable() });
const scenarioSchema = z.object({ id: z.union([z.literal('A'), z.literal('B'), z.literal('C')]), title: z.string().min(1), slots: z.array(slotSchema).length(4) });
export const labPlanSchema = z.object({ scenarios: z.array(scenarioSchema).length(3) });
export type LabPlan = z.infer<typeof labPlanSchema>;
const slots = (cropId: LabCropId | null) => [{ year: 1 as const, season: 'A' as const, cropId }, { year: 1 as const, season: 'B' as const, cropId: null }, { year: 2 as const, season: 'A' as const, cropId: null }, { year: 2 as const, season: 'B' as const, cropId: null }];

/** Creates hypotheses from the existing engine's first prospective crop only. Empty slots remain unknown. */
export function createLabPlan(input: AnalysisInput, cropIds: Array<string | undefined>): LabPlan {
  const valid = (cropId: string | undefined): LabCropId | null => LAB_CROP_IDS.includes(cropId as LabCropId) ? cropId as LabCropId : null;
  return { scenarios: [
    { id: 'A', title: input.futureBaseline?.confirmed ? 'Plano do produtor' : 'Continuidade presumida — confirmar', slots: slots(valid(cropIds[0])) },
    { id: 'B', title: 'Saúde do solo', slots: slots(valid(cropIds[1])) },
    { id: 'C', title: 'Contexto hídrico', slots: slots(valid(cropIds[2])) },
  ] };
}

export function changeLabSlot(plan: LabPlan, scenarioId: 'A' | 'B' | 'C', slotIndex: number, cropId: LabCropId | null): LabPlan {
  return { scenarios: plan.scenarios.map((scenario) => scenario.id !== scenarioId ? scenario : { ...scenario, slots: scenario.slots.map((slot, index) => index === slotIndex ? { ...slot, cropId } : slot) }) };
}

export function labPrimaryCrop(plan: LabPlan, scenarioId: 'A' | 'B' | 'C'): string | undefined { return plan.scenarios.find((item) => item.id === scenarioId)?.slots.find((slot) => slot.cropId)?.cropId ?? undefined; }
