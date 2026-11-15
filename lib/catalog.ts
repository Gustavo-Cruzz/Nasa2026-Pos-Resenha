import { z } from 'zod';
import cropRecords from '@/data/crops.json';
import evidenceDocument from '@/data/crop-evidence.json';
import familyFarmCropRecords from '@/FieldShift_AgriculturaFamiliar_Consorcios_2026/family-farm-crops.seed.json';
import familyFarmMetadataDocument from '@/FieldShift_AgriculturaFamiliar_Consorcios_2026/family-farm-crop-metadata.seed.json';
import familyFarmEvidenceDocument from '@/FieldShift_AgriculturaFamiliar_Consorcios_2026/family-farm-evidence.seed.json';

const nullableRange = z.object({ min: z.number(), max: z.number() }).nullable();
const kcStageSchema = z.object({ stage: z.string().min(1), kc: z.number().positive(), days: z.union([z.number().positive(), z.object({ min: z.number().positive(), max: z.number().positive() })]).optional() });
export const cropSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9_]*$/),
  commonNames: z.object({ 'pt-BR': z.string(), en: z.string() }), scientificName: z.string(), family: z.string(), purposes: z.array(z.enum(['commercial', 'cover', 'forage'])), commercial: z.boolean(), cycleDaysRange: nullableRange, idealTempC: nullableRange, viableTempC: nullableRange, soilPhRange: nullableRange, kcStages: z.array(kcStageSchema).nullable(), residuePotential: z.string().nullable(), nitrogenFixationPotential: z.string().nullable(), diseaseNotes: z.array(z.string()).optional(), rootingClass: z.string().nullable(), regionalWindows: z.array(z.unknown()), knownRisks: z.array(z.string()), sourceRefs: z.array(z.string().url()), parameterStatus: z.enum(['verified', 'provisional', 'missing']),
});
export type Crop = z.infer<typeof cropSchema>;
const evidenceRecordSchema = z.object({
  cropId: z.string(),
  field: z.string(),
  value: z.unknown().nullable(),
  unit: z.string().nullable(),
  context: z.string().min(1),
  cultivar: z.string().nullable(),
  /** Set when a newer/preferred source replaces this record in the catalog projection; the record stays for provenance. */
  supersededBy: z.string().optional(),
  location: z.string().min(1),
  source: z.object({
    title: z.string().min(1),
    institution: z.string().nullable(),
    year: z.number().int().positive().nullable(),
    url: z.string().url().nullable(),
    accessedAt: z.string().date(),
    pageOrSection: z.string().min(1),
    snippet: z.string().min(1),
    verification: z.enum(['verified', 'verified_source_text', 'not_verified']),
  }),
});
export type CropEvidenceRecord = z.infer<typeof evidenceRecordSchema>;
const baseEvidence = z.object({ version: z.number(), records: z.array(evidenceRecordSchema) }).parse(evidenceDocument).records;
const familyFarmEvidence = z.object({ version: z.string(), records: z.array(evidenceRecordSchema) }).parse(familyFarmEvidenceDocument).records;
/** Source records remain contextual; harvest references never populate cycleDaysRange. */
export const cropEvidence = [...baseEvidence, ...familyFarmEvidence];
const rangeFields = new Set(['cycleDaysRange', 'idealTempC', 'viableTempC', 'soilPhRange']);
const isVerified = (record: CropEvidenceRecord) => record.source.verification === 'verified' || record.source.verification === 'verified_source_text';
const isActive = (record: CropEvidenceRecord) => isVerified(record) && !record.supersededBy;
const diseaseLabels: Record<string, string> = { resistant: 'resistente', moderatelyResistant: 'moderadamente resistente', moderatelySusceptible: 'moderadamente suscetível', susceptible: 'suscetível' };
/** Cultivar-specific disease statements; never a species-wide claim. */
function diseaseNote(record: CropEvidenceRecord): string | null {
  const value = record.value;
  const prefix = record.cultivar ? `${record.cultivar}: ` : '';
  if (record.field === 'diseaseProfile' && typeof value === 'object' && value !== null) {
    const parts = Object.entries(value as Record<string, unknown>).flatMap(([key, items]) => Array.isArray(items) && items.length > 0 ? [`${diseaseLabels[key] ?? key}: ${items.join(', ')}`] : []);
    return parts.length > 0 ? `${prefix}${parts.join('; ')} (específico da cultivar)` : null;
  }
  if (record.field === 'diseaseResistance' && typeof value === 'object' && value !== null) {
    const item = value as { disease?: unknown; race?: unknown; response?: unknown };
    return typeof item.disease === 'string' ? `${prefix}${item.disease}${item.race ? ` (raça ${String(item.race)})` : ''}: ${String(item.response ?? 'resposta documentada')} (específico da cultivar)` : null;
  }
  return null;
}
function isRange(value: unknown): value is { min: number; max: number } { return typeof value === 'object' && value !== null && 'min' in value && 'max' in value && typeof value.min === 'number' && typeof value.max === 'number'; }
const mergedCropRecords = [...cropRecords, ...familyFarmCropRecords].filter((crop, index, collection) => collection.findIndex((item) => item.id === crop.id) === index);
if (mergedCropRecords.length !== cropRecords.length + familyFarmCropRecords.length) throw new Error('Family-farm crop merge contains a duplicate catalog ID.');
export const crops = z.array(cropSchema).parse(mergedCropRecords.map((crop) => {
  const records = cropEvidence.filter((record) => record.cropId === crop.id && isActive(record));
  const values = Object.fromEntries(records.filter((record) => (rangeFields.has(record.field) && isRange(record.value)) || (record.field === 'kcStages' && z.array(kcStageSchema).safeParse(record.value).success)).map((record) => [record.field, record.value]));
  const nitrogen = records.find((record) => record.field === 'nitrogenFixationPotential' && typeof record.value === 'string');
  const diseaseNotes = records.flatMap((record) => diseaseNote(record) ?? []);
  const sourceRefs = [...new Set([...crop.sourceRefs, ...records.flatMap((record) => record.source.url ? [record.source.url] : [])])];
  return { ...crop, ...values, ...(nitrogen ? { nitrogenFixationPotential: nitrogen.value as string } : {}), ...(diseaseNotes.length > 0 ? { diseaseNotes } : {}), sourceRefs };
}));
export const cropById = new Map(crops.map((crop) => [crop.id, crop]));
const cropMetadataSchema = z.object({ version: z.number(), newCrops: z.array(z.object({ cropId: z.string(), catalogTier: z.enum(['P0', 'P1', 'P2']), lifeCycle: z.enum(['annual', 'annual_management_long_cycle', 'perennial_grown_as_annual', 'biennial_grown_as_annual', 'biennial_often_perennial_management', 'perennial']), rotationEngineEligible: z.boolean(), taxonResolution: z.string(), profileStatus: z.string(), origin: z.string(), usageRestrictions: z.string() })), existingCropAliases: z.array(z.object({ id: z.string(), ptBRAliases: z.array(z.string()), taxonNote: z.string() })) });
export type CropMetadata = z.infer<typeof cropMetadataSchema>['newCrops'][number];
const familyFarmMetadata = cropMetadataSchema.parse(familyFarmMetadataDocument);
export const cropMetadataById = new Map<string, CropMetadata>(familyFarmMetadata.newCrops.map((item) => [item.cropId, item]));
export const cropAliases = new Map(familyFarmMetadata.existingCropAliases.flatMap((item) => item.ptBRAliases.map((alias) => [alias.toLocaleLowerCase('pt-BR'), item.id])));
export function isAnnualRotationEligible(cropId: string): boolean { return cropMetadataById.get(cropId)?.rotationEngineEligible ?? true; }
export function isPermanentCrop(cropId: string): boolean { return cropMetadataById.get(cropId)?.lifeCycle === 'perennial'; }
export const annualRotationCrops = crops.filter((crop) => isAnnualRotationEligible(crop.id));
export function verifiedCropEvidence(cropId: string, field: string): CropEvidenceRecord | undefined { return cropEvidence.find((record) => record.cropId === cropId && record.field === field && isActive(record)); }
export function isRecommendationEligible(crop: Crop): boolean { return crop.parameterStatus === 'verified' && crop.id !== 'cotton' && crop.id !== 'pigeon_pea'; }
