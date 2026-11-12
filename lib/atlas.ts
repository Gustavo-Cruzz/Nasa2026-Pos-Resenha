import { z } from 'zod';
import { coordinatesSchema } from '@/lib/schema';

export const atlasPointSchema = coordinatesSchema.extend({ label: z.string().min(1).optional() });
export type AtlasPoint = z.infer<typeof atlasPointSchema>;

const monthlyClimateSchema = z.object({ month: z.number().int().min(1).max(12), tmeanMedianC: z.number().nullable(), precipMedianMm: z.number().nullable(), validTemperatureDays: z.number().int().nonnegative(), validPrecipitationDays: z.number().int().nonnegative() });
export const climateApiResponseSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('ok'), origin: z.enum(['live', 'verified_fixture']), climateSummary: z.object({ monthly: z.array(monthlyClimateSchema), plantingMonthPrecipitation: z.object({ month: z.number().int(), medianTotalMm: z.number().nullable(), validYears: z.number().int(), expectedYears: z.number().int(), coveragePct: z.number() }).nullable() }), provenance: z.object({ sourceUrl: z.string().url(), period: z.object({ start: z.string(), end: z.string() }), fetchedAt: z.string(), coveragePct: z.record(z.string(), z.number()), missingDays: z.array(z.string()) }), warnings: z.array(z.string()) }),
  z.object({ status: z.literal('error'), code: z.string(), message: z.string() }),
]);
export type ClimateApiResponse = z.infer<typeof climateApiResponseSchema>;

export const ATLAS_EXAMPLES: Array<AtlasPoint & { label: string }> = [
  { label: 'Rio Verde (GO), Brasil', latitude: -17.798, longitude: -50.919 },
  { label: 'Acra, Gana', latitude: 5.6037, longitude: -0.187 },
  { label: 'Nova Délhi, Índia', latitude: 28.6139, longitude: 77.209 },
];
