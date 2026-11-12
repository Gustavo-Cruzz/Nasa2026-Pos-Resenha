import { z } from 'zod';
import cropRecords from '@/data/crops.json';
import evidenceDocument from '@/data/crop-evidence.json';

const nullableRange = z.object({ min: z.number(), max: z.number() }).nullable();
export const cropSchema = z.object({
  id: z.enum(['soybean', 'maize', 'sorghum', 'sunflower', 'cowpea', 'pearl_millet', 'ruziziensis', 'sunn_hemp', 'cotton', 'pigeon_pea']),
  commonNames: z.object({ 'pt-BR': z.string(), en: z.string() }), scientificName: z.string(), family: z.string(), purposes: z.array(z.enum(['commercial', 'cover', 'forage'])), commercial: z.boolean(), cycleDaysRange: nullableRange, idealTempC: nullableRange, viableTempC: nullableRange, soilPhRange: nullableRange, kcStages: z.unknown().nullable(), residuePotential: z.string().nullable(), nitrogenFixationPotential: z.string().nullable(), rootingClass: z.string().nullable(), regionalWindows: z.array(z.unknown()), knownRisks: z.array(z.string()), sourceRefs: z.array(z.string().url()), parameterStatus: z.enum(['verified', 'provisional', 'missing']),
});
export type Crop = z.infer<typeof cropSchema>;
const evidenceRecordSchema = z.object({ cropId: z.string(), field: z.string(), value: z.unknown().nullable(), source: z.object({ url: z.string().url().nullable(), verification: z.enum(['verified', 'not_verified']) }) });
export type CropEvidenceRecord = z.infer<typeof evidenceRecordSchema>;
export const cropEvidence = z.object({ version: z.number(), records: z.array(evidenceRecordSchema) }).parse(evidenceDocument).records;
const rangeFields = new Set(['cycleDaysRange', 'idealTempC', 'viableTempC', 'soilPhRange']);
function isRange(value: unknown): value is { min: number; max: number } { return typeof value === 'object' && value !== null && 'min' in value && 'max' in value && typeof value.min === 'number' && typeof value.max === 'number'; }
export const crops = z.array(cropSchema).length(10).parse(cropRecords.map((crop) => {
  const records = cropEvidence.filter((record) => record.cropId === crop.id && record.source.verification === 'verified');
  const values = Object.fromEntries(records.filter((record) => rangeFields.has(record.field) && isRange(record.value)).map((record) => [record.field, record.value]));
  const sourceRefs = [...new Set([...crop.sourceRefs, ...records.flatMap((record) => record.source.url ? [record.source.url] : [])])];
  return { ...crop, ...values, sourceRefs };
}));
export const cropById = new Map(crops.map((crop) => [crop.id, crop]));
export function isRecommendationEligible(crop: Crop): boolean { return crop.parameterStatus === 'verified' && crop.id !== 'cotton' && crop.id !== 'pigeon_pea'; }
