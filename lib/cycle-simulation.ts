import { z } from 'zod';
import document from '@/data/plantae_ciclos_17_culturas_v2.2.json';
import crops from '@/data/crops.json';
import familyCrops from '@/FieldShift_AgriculturaFamiliar_Consorcios_2026/family-farm-crops.seed.json';

const range = z.object({ min: z.number().positive(), max: z.number().positive() }).refine((item) => item.min <= item.max);
const publicUrl = z.string().url().refine((value) => /^https?:$/.test(new URL(value).protocol));
const record = z.object({ cropId: z.string(), field: z.literal('cycleDaysRange'), value: range.nullable(), verification: z.enum(['no_fixed_terminal_cycle', 'estimated_calendar_conversion', 'verified_contextual', 'verified_specific_cultivar', 'verified_with_harvest_assumption', 'verified_single_study', 'estimated_from_harvest_window', 'perennial_no_automatic_release']), simulationDaysRange: range.nullable(), simulationVerification: z.enum(['estimated_heuristic', 'estimated_emergence_lag']).optional(), startEvent: z.string().min(1), endEvent: z.string().min(1).nullable(), occupies24Months: z.boolean().optional(), context: z.object({ cultivar: z.string().nullable(), purpose: z.string().min(1), region: z.string().min(1), productionSystem: z.string().min(1), cycleDefinition: z.string().min(1) }), source: z.object({ title: z.string().min(1), url: publicUrl, locator: z.string().min(1), accessedAt: z.string().date() }), milestones: z.array(z.object({ kind: z.string().min(1), value: range, unit: z.enum(['days', 'months', 'years']), sourceUrl: publicUrl.optional() }).strict()).optional(), warning: z.string().optional(), referenceRange: range.and(z.object({ unit: z.enum(['months', 'years', 'days']) })).optional(), assumedEmergenceLagDays: range.optional() }).strict().superRefine((item, ctx) => {
  if (item.verification === 'perennial_no_automatic_release' && (item.value !== null || item.simulationDaysRange !== null || !item.occupies24Months || item.endEvent !== null)) ctx.addIssue({ code: 'custom', message: 'Perennials cannot automatically release the field.' });
});
export const cycleSimulationSchema = z.object({ schemaVersion: z.literal('2.2.0'), updatedAt: z.string().date(), planningHorizonMonths: z.literal(24), usage: z.literal('exploratory_simulation'), policy: z.object({ allowEstimates: z.literal(true), showEstimateWarning: z.literal(true), requiresContextConfirmation: z.literal(true), unknownIsNotZero: z.literal(true), estimatesAllowedForRecommendations: z.literal(false), estimatesAllowedForZARC: z.literal(false), perennialOccupiesPlanningHorizon: z.literal(true) }).strict(), records: z.array(record).length(17) }).strict().superRefine((data, ctx) => {
  const ids = new Set([...crops, ...familyCrops].map((crop) => crop.id));
  if (new Set(data.records.map((item) => item.cropId)).size !== 17 || data.records.some((item) => !ids.has(item.cropId))) ctx.addIssue({ code: 'custom', message: 'Expected 17 unique catalog crop IDs.' });
});
export const cycleSimulationDataset = cycleSimulationSchema.parse(document);
export type CycleSimulationRecord = z.infer<typeof record>;

/** Explicit producer confirmation is required; estimates never feed ZARC or recommendations. */
export function resolveCycleSimulation(cropId: string, contextConfirmed: boolean, usage: 'exploratory_simulation' | 'recommendation' | 'zarc' = 'exploratory_simulation') {
  const evidence = cycleSimulationDataset.records.find((item) => item.cropId === cropId);
  if (!evidence || !contextConfirmed || usage !== 'exploratory_simulation') return null;
  return { evidence, daysRange: evidence.simulationDaysRange, horizonMonths: evidence.occupies24Months ? 24 : null, estimated: Boolean(evidence.simulationVerification || evidence.verification.startsWith('estimated_')), warning: evidence.warning ?? 'Referência contextual para simulação exploratória; confirme cultivar, região, sistema e marco inicial.' };
}
