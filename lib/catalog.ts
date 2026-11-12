import { z } from 'zod';
import cropRecords from '@/data/crops.json';
import evidence from '@/data/crop-evidence.json';

const nullableRange = z.object({ min: z.number(), max: z.number() }).nullable();
export const cropSchema = z.object({
  id: z.enum(['soybean', 'maize', 'sorghum', 'sunflower', 'cowpea', 'pearl_millet', 'ruziziensis', 'sunn_hemp', 'cotton', 'pigeon_pea']),
  commonNames: z.object({ 'pt-BR': z.string(), en: z.string() }), scientificName: z.string(), family: z.string(), purposes: z.array(z.enum(['commercial', 'cover', 'forage'])), commercial: z.boolean(), cycleDaysRange: nullableRange, idealTempC: nullableRange, viableTempC: nullableRange, soilPhRange: nullableRange, kcStages: z.unknown().nullable(), residuePotential: z.string().nullable(), nitrogenFixationPotential: z.string().nullable(), rootingClass: z.string().nullable(), regionalWindows: z.array(z.unknown()), knownRisks: z.array(z.string()), sourceRefs: z.array(z.string().url()), parameterStatus: z.enum(['verified', 'provisional', 'missing']),
});
export type Crop = z.infer<typeof cropSchema>;
type Evidence = Partial<Pick<Crop, 'cycleDaysRange' | 'idealTempC' | 'viableTempC' | 'soilPhRange'>> & { source: string; context: string };
const evidenceByCrop = evidence as Record<string, Evidence>;
export const crops = z.array(cropSchema).length(10).parse(cropRecords.map((crop) => { const item = evidenceByCrop[crop.id]; return { ...crop, ...(item ? { cycleDaysRange: item.cycleDaysRange ?? crop.cycleDaysRange, idealTempC: item.idealTempC ?? crop.idealTempC, viableTempC: item.viableTempC ?? crop.viableTempC, soilPhRange: item.soilPhRange ?? crop.soilPhRange, sourceRefs: [...crop.sourceRefs, item.source] } : {}) }; }));
export const cropById = new Map(crops.map((crop) => [crop.id, crop]));
export function isRecommendationEligible(crop: Crop): boolean { return crop.parameterStatus === 'verified' && crop.id !== 'cotton' && crop.id !== 'pigeon_pea'; }
