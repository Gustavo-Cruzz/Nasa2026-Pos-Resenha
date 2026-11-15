import { z } from 'zod';
import artifactJson from '@/data/soil/brazil-municipal-moisture-v1.json';
import { resolveBrazilMunicipality } from '@/lib/brazil/context';
import type { Coordinates } from '@/lib/schema';

const latestSchema = z.object({ period: z.string().regex(/^\d{6}$/), value: z.number().min(0).max(1), percentile: z.number().int().min(0).max(100).nullable(), baselineYears: z.object({ start: z.literal(2015), end: z.literal(2025) }) });
const entrySchema = z.object({ status: z.enum(['available', 'partial', 'unavailable']), municipality: z.object({ code: z.string(), name: z.string(), uf: z.string() }), gridPoint: z.object({ latitude: z.number(), longitude: z.number() }).nullable(), monthlyClimatology: z.array(z.number().min(0).max(1).nullable()).length(12), latest: latestSchema.nullable() });
const artifactSchema = z.object({ schemaVersion: z.literal(1), id: z.string(), status: z.enum(['available', 'partial']), generatedAt: z.string().datetime(), parameter: z.literal('GWETROOT'), unit: z.literal('1'), classification: z.literal('observed_modelled'), temporal: z.object({ startYear: z.literal(2015), endYear: z.number().int(), climatologyEndYear: z.literal(2025), latestPeriodVariesByGridCell: z.literal(true) }), source: z.object({ provider: z.literal('NASA POWER'), methodologyUrl: z.string().url() }), coverage: z.object({ totalMunicipalities: z.literal(5571), available: z.number().int() }), entries: z.record(z.string(), entrySchema), limitations: z.array(z.string()) });
const artifact = artifactSchema.parse(artifactJson);

export type MunicipalMoistureContext = { status: 'available' | 'unavailable'; classification: 'observed_modelled' | 'unknown'; artifactId: string; generatedAt: string; municipality: { code: string; name: string; uf: string } | null; parameter: 'GWETROOT'; unit: '1'; gridPoint: { latitude: number; longitude: number } | null; monthlyClimatology: Array<number | null>; latest: z.infer<typeof latestSchema> | null; source: { provider: 'NASA POWER'; methodologyUrl: string }; limitations: string[] };

/** Preprocessed NASA lookup; no runtime network request and no cross-municipality substitution. */
export function resolveMunicipalMoisture(location: Coordinates): MunicipalMoistureContext {
  const municipality = resolveBrazilMunicipality(location); const entry = municipality ? artifact.entries[municipality.code] : undefined; const base = { artifactId: artifact.id, generatedAt: artifact.generatedAt, parameter: 'GWETROOT' as const, unit: '1' as const, source: artifact.source, limitations: artifact.limitations };
  if (!entry || entry.status !== 'available' || !entry.latest) return { ...base, status: 'unavailable', classification: 'unknown', municipality, gridPoint: entry?.gridPoint ?? null, monthlyClimatology: entry?.monthlyClimatology ?? Array(12).fill(null), latest: null };
  return { ...base, status: 'available', classification: 'observed_modelled', municipality: entry.municipality, gridPoint: entry.gridPoint, monthlyClimatology: entry.monthlyClimatology, latest: entry.latest };
}
