import { z } from 'zod';
import document from '@/data/plantae_F31_lote3_sistema_radicular_28_culturas_2026-11-18.json';
import crops from '@/data/crops.json';
import familyCrops from '@/FieldShift_AgriculturaFamiliar_Consorcios_2026/family-farm-crops.seed.json';

const url = z.string().url().refine((value) => /^https?:$/.test(new URL(value).protocol));
const source = z.object({ title: z.string().min(1), institution: z.string().min(1), url, locator: z.string().min(1), excerpt: z.string().nullable(), accessedAt: z.string().date() }).strict();
const range = z.object({ min: z.number().nonnegative(), max: z.number().nonnegative() }).strict().refine((value) => value.min <= value.max);
const depth = z.object({ minCm: z.number().nonnegative().nullable(), maxCm: z.number().nonnegative().nullable(), unit: z.literal('cm'), depthDefinition: z.string().min(1), observedMaximumReachCm: z.number().nonnegative().optional(), phaseValuesCm: z.record(z.number().nonnegative()).optional(), isStatisticalRange: z.boolean().optional(), rootFractionPercent: z.number().min(0).max(100).optional() }).strict().superRefine((value, ctx) => {
  if (value.minCm !== null && value.maxCm !== null && value.minCm > value.maxCm) ctx.addIssue({ code: 'custom', message: 'Root depth bounds must be ordered.' });
});
const additional = z.object({ kind: z.string().min(1), depthCm: range.optional(), description: z.string().optional(), context: z.string().optional(), source, interpretation: z.string().optional() }).strict();
const record = z.object({ cropId: z.string().min(1), field: z.literal('rootSystem'), value: z.object({ rootArchitecture: z.string().nullable(), depth: depth.nullable(), rootCharacteristics: z.string().min(1) }).strict(), unit: z.literal('cm').nullable(), evidenceType: z.enum(['observed_profile', 'contextual_effective_depth_reference', 'qualitative_or_contextual']), context: z.object({ species: z.string().min(1), cultivar: z.string().nullable(), location: z.string().min(1), productionSystem: z.string().min(1), management: z.string().min(1), soil: z.string().min(1), growthStage: z.string().nullable() }).strict(), source, status: z.literal('source_found'), reviewStatus: z.literal('pending'), limitations: z.array(z.string()), conflicts: z.array(z.object({ description: z.string().min(1), sourceUrl: url, resolution: z.string().min(1) }).strict()), additionalEvidence: z.array(additional), readyForAutomaticSuitabilityScoring: z.literal(false) }).strict();
export const f31Lot3Schema = z.object({ schemaVersion: z.literal('1.0.0'), datasetId: z.string().min(1), researchDate: z.string().date(), field: z.literal('rootSystem'), reviewPolicy: z.object({ reviewStatus: z.literal('pending'), readyForAutomaticSuitabilityScoring: z.literal(false), noNumericImputation: z.literal(true), doNotUseToCalculateIrrigationOrETc: z.literal(true), neverInferMunicipalSuitability: z.literal(true), notDirectlyComparableDepthTypes: z.array(z.string().min(1)) }).strict(), records: z.array(record).length(28) }).strict().superRefine((data, ctx) => {
  const ids = new Set([...crops, ...familyCrops].map((crop) => crop.id));
  if (ids.size !== 28 || new Set(data.records.map((item) => item.cropId)).size !== 28 || data.records.some((item) => !ids.has(item.cropId))) ctx.addIssue({ code: 'custom', message: 'Expected one root record for each of 28 catalog crops.' });
});
export const f31Lot3 = f31Lot3Schema.parse(document);
