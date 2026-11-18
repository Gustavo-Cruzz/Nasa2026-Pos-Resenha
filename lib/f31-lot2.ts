import { z } from 'zod';
import document from '@/data/plantae_F31_lote2_temperatura_ph_28_culturas_2026-11-18.json';
import crops from '@/data/crops.json';
import familyCrops from '@/FieldShift_AgriculturaFamiliar_Consorcios_2026/family-farm-crops.seed.json';

const url = z.string().url().refine((value) => /^https?:$/.test(new URL(value).protocol));
const range = z.object({ min: z.number().finite(), max: z.number().finite() }).strict().refine((item) => item.min <= item.max);
const recordSchema = z.object({
  cropId: z.string().min(1), field: z.enum(['temperatureRange', 'soilPhRange']), value: range.nullable(), unit: z.enum(['°C', 'pH']),
  evidenceType: z.enum(['institutional_agronomic_adaptation_reference', 'expert_compiled_ecological_optimum', 'institutional_phenology_stage_optimum', 'institutional_regional_management_reference', 'institutional_optimal_mean_air_temperature', 'institutional_management_target', 'institutional_optimal_annual_mean']),
  variableDefinition: z.string().min(1), context: z.object({ species: z.string().min(1), cultivar: z.string().nullable(), location: z.string().min(1), productionSystem: z.string().min(1), management: z.string().min(1) }).strict(),
  source: z.object({ title: z.string().min(1), institution: z.string().min(1), url, locator: z.string().min(1), excerpt: z.string().min(1), accessedAt: z.string().date() }).strict(),
  status: z.literal('source_found'), reviewStatus: z.literal('pending'), limitations: z.array(z.string()), conflicts: z.array(z.object({ description: z.string().min(1), sourceUrl: url }).strict()), applicability: z.literal('contextual_reference_only'), readyForAutomaticSuitabilityScoring: z.literal(false),
}).strict().superRefine((item, ctx) => {
  if (item.status === 'source_found' && item.value === null) ctx.addIssue({ code: 'custom', message: 'A sourced range must have a value.' });
  if ((item.field === 'temperatureRange' && item.unit !== '°C') || (item.field === 'soilPhRange' && (item.unit !== 'pH' || (item.value && (item.value.min < 0 || item.value.max > 14))))) ctx.addIssue({ code: 'custom', message: 'Invalid unit or pH range.' });
});
export const f31Lot2Schema = z.object({
  researchDate: z.string().date(), datasetId: z.string().min(1), compatibleWithCycleDatasetVersion: z.string().min(1), scope: z.string().min(1),
  policy: z.object({ reviewStatus: z.literal('pending'), automaticallyApplicableToFarm: z.literal(false), allowAsDisplayedReference: z.literal(true), allowForAutomaticSuitabilityScoring: z.literal(false), neverTreatEcologicalAbsoluteLimitsAsVerifiedSafeLimits: z.literal(true), requireSpeciesCultivarProductionSystemAndTemperatureStatistic: z.literal(true), pHMeasurementMethodRequiredForPlotComparison: z.literal(true), unknownIsNotZero: z.literal(true) }).strict(),
  methodologyNotes: z.array(z.string()), references: z.record(url), records: z.array(recordSchema).length(56),
}).strict().superRefine((data, ctx) => {
  const ids = new Set([...crops, ...familyCrops].map((crop) => crop.id));
  if (ids.size !== 28 || new Set(data.records.map((item) => `${item.cropId}:${item.field}`)).size !== 56 || data.records.some((item) => !ids.has(item.cropId))) ctx.addIssue({ code: 'custom', message: 'Expected both fields for each of 28 catalog crops.' });
});
export const f31Lot2 = f31Lot2Schema.parse(document);
