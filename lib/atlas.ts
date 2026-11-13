import { z } from 'zod';
import { coordinatesSchema } from '@/lib/schema';

export const atlasPointSchema = coordinatesSchema.extend({ label: z.string().min(1).optional() });
export type AtlasPoint = z.infer<typeof atlasPointSchema>;

const monthlyClimateSchema = z.object({ month: z.number().int().min(1).max(12), tmeanMedianC: z.number().nullable(), precipMedianMm: z.number().nullable(), validTemperatureDays: z.number().int().nonnegative(), validPrecipitationDays: z.number().int().nonnegative() });
export const climateApiResponseSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('ok'), origin: z.enum(['live', 'verified_fixture']), climateSummary: z.object({ monthly: z.array(monthlyClimateSchema), plantingMonthPrecipitation: z.object({ month: z.number().int(), medianTotalMm: z.number().nullable(), validYears: z.number().int(), expectedYears: z.number().int(), coveragePct: z.number() }).nullable(), historicalPrecipitationByMonth: z.array(z.object({ month: z.number().int().min(1).max(12), medianTotalMm: z.number().nullable(), validYears: z.number().int(), expectedYears: z.number().int(), coveragePct: z.number() })).default([]) }), provenance: z.object({ sourceUrl: z.string().url(), period: z.object({ start: z.string(), end: z.string() }), fetchedAt: z.string(), coveragePct: z.record(z.string(), z.number()), missingDays: z.array(z.string()) }), warnings: z.array(z.string()) }),
  z.object({ status: z.literal('error'), code: z.string(), message: z.string() }),
]);
export type ClimateApiResponse = z.infer<typeof climateApiResponseSchema>;

const zarcCropContextSchema = z.object({ cropId: z.string(), rowCount: z.number().int().positive(), zarcCultures: z.array(z.string()), cycleCodes: z.array(z.number()), soilCodes: z.array(z.number()), climateCodes: z.array(z.number()), managements: z.array(z.string()), ordinances: z.array(z.string()), riskCodes: z.array(z.number()), decendiosWithRiskCode: z.array(z.number().int()) });
export const brazilRegionalContextSchema = z.object({
  country: z.literal('BR').nullable(),
  municipality: z.object({ code: z.string().regex(/^\d{7}$/), name: z.string(), uf: z.string().length(2) }).nullable(),
  municipalitySource: z.object({ version: z.literal('2025'), url: z.string().url(), officialMeshUrl: z.string().url(), accessedAt: z.string(), referenceSystem: z.string(), sha256: z.string().length(64) }).nullable(),
  zarc: z.object({ safra: z.string(), sourceUrl: z.string().url(), dictionaryUrl: z.string().url(), accessedAt: z.string(), sha256: z.string().length(64), crops: z.record(z.string(), zarcCropContextSchema) }).nullable(),
  pam: z.object({ year: z.string(), sourceUrl: z.string().url(), accessedAt: z.string(), sha256: z.string().length(64), caveat: z.string(), products: z.array(z.object({ productCode: z.string(), productLabel: z.string(), cropIds: z.array(z.string()), harvestedAreaHa: z.number().nullable(), producedQuantity: z.number().nullable(), productionUnit: z.string().nullable(), caveat: z.string().nullable() })) }).nullable(),
  gaps: z.array(z.string()),
});
export const regionalContextApiResponseSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('ok'), context: brazilRegionalContextSchema }),
  z.object({ status: z.literal('error'), code: z.string(), message: z.string() }),
]);
export type RegionalContextApiResponse = z.infer<typeof regionalContextApiResponseSchema>;

export const ATLAS_EXAMPLES: Array<AtlasPoint & { label: string }> = [
  { label: 'Rio Verde (GO), Brasil', latitude: -17.798, longitude: -50.919 },
  { label: 'Acra, Gana', latitude: 5.6037, longitude: -0.187 },
  { label: 'Nova Délhi, Índia', latitude: 28.6139, longitude: 77.209 },
];
