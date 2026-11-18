import { z } from 'zod';
import document from '@/data/plantae_F31_lote4_kc_ciclos_28_culturas_2026-11-18.json';
import crops from '@/data/crops.json';
import familyCrops from '@/FieldShift_AgriculturaFamiliar_Consorcios_2026/family-farm-crops.seed.json';

const url = z.string().url().refine((value) => /^https?:$/.test(new URL(value).protocol));
const source = z.object({ title: z.string().min(1), institution: z.string().min(1), url, locator: z.string().min(1), excerpt: z.string().nullable(), accessedAt: z.string().date() }).strict();
const record = z.object({ cropId: z.string().min(1), field: z.enum(['kcByStage', 'cycleStages']), value: z.record(z.unknown()).nullable(), unit: z.enum(['dimensionless', 'days']), evidenceType: z.string().min(1), context: z.object({ species: z.string().min(1), cultivar: z.string().nullable(), location: z.string().min(1), productionSystem: z.string().min(1), management: z.string().nullable(), purposeOrPhase: z.string().min(1) }).strict(), source, status: z.enum(['source_found', 'insufficient_source', 'not_applicable']), reviewStatus: z.literal('pending'), readyForAutomaticDecision: z.literal(false), limitations: z.array(z.string()), conflicts: z.array(z.object({ description: z.string().min(1), comparison: z.string().optional(), sourceUrl: url.optional() }).strict()), applicability: z.string().optional(), usableForAutomaticSlotCalendar: z.literal(false).optional(), alternativeEvidence: z.object({ source, cultivarGroup: z.string().optional(), kcDecadal: z.array(z.number().nonnegative()).optional(), cycleDays: z.number().positive().optional(), note: z.string().optional(), description: z.string().optional() }).strict().optional(), potentialSource: source.optional(), previousDataset2_2: z.object({ field: z.string(), value: z.unknown().nullable(), verification: z.string(), sourceUrl: url, note: z.string() }).strict().optional() }).strict().superRefine((item, ctx) => {
  if ((item.status === 'source_found') !== (item.value !== null)) ctx.addIssue({ code: 'custom', message: 'Only sourced values can be non-null.' });
  if ((item.field === 'kcByStage' && item.unit !== 'dimensionless') || (item.field === 'cycleStages' && item.unit !== 'days')) ctx.addIssue({ code: 'custom', message: 'Unit must match field.' });
  const check = (value: unknown): void => {
    if (typeof value === 'number' && (!Number.isFinite(value) || value < 0)) ctx.addIssue({ code: 'custom', message: 'Reference numbers must be finite and nonnegative.' });
    if (value && typeof value === 'object') {
      const object = value as Record<string, unknown>;
      if (typeof object.min === 'number' && typeof object.max === 'number' && object.min > object.max) ctx.addIssue({ code: 'custom', message: 'Range bounds must be ordered.' });
      for (const nested of Object.values(object)) check(nested);
    }
  };
  check(item.value);
});
export const f31Lot4Schema = z.object({ schemaVersion: z.literal('1.0.0'), datasetId: z.string().min(1), researchDate: z.string().date(), basedOnDatasetId: z.string().min(1), scope: z.string().min(1), policy: z.object({ reviewStatus: z.literal('pending'), publishAsReferenceOnly: z.literal(true), doNotComputeETcOrIrrigation: z.literal(true), doNotOverwriteCycleDaysRange22: z.literal(true), doNotInferSpeciesFromFamily: z.literal(true), doNotAutoReleasePerennialsOrRepeatedHarvest: z.literal(true), unknownIsNotZero: z.literal(true), requiresCultivarProductionSystemAndStartEvent: z.literal(true), readyForAutomaticDecision: z.literal(false) }).strict(), fieldDefinitions: z.object({ kcByStage: z.string().min(1), cycleStages: z.string().min(1) }).strict(), records: z.array(record).length(56) }).strict().superRefine((data, ctx) => {
  const ids = new Set([...crops, ...familyCrops].map((crop) => crop.id));
  if (ids.size !== 28 || new Set(data.records.map((item) => `${item.cropId}:${item.field}`)).size !== 56 || data.records.some((item) => !ids.has(item.cropId))) ctx.addIssue({ code: 'custom', message: 'Expected both fields for every catalog crop.' });
});
export const f31Lot4 = f31Lot4Schema.parse(document);
