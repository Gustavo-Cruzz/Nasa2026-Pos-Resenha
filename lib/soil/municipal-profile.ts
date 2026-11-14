import { z } from 'zod';
import artifactJson from '@/data/soil/brazil-municipal-soil-v1.json';
import { resolveBrazilMunicipality } from '@/lib/brazil/context';
import type { Coordinates } from '@/lib/schema';

const attributeIdSchema = z.enum(['phh2o', 'soc', 'clay', 'sand', 'silt', 'cec', 'bdod', 'wv0033', 'wv1500']);
const attributeSchema = z.object({ value: z.number().nullable(), unit: z.string().min(1) });
const entrySchema = z.object({ municipality: z.object({ code: z.string(), name: z.string(), uf: z.string() }), referencePoint: z.object({ longitude: z.number(), latitude: z.number() }), depthCm: z.object({ min: z.literal(0), max: z.literal(30) }), classification: z.literal('estimated'), attributes: z.record(attributeIdSchema, attributeSchema), textureClass: z.enum(['very_clayey', 'clayey', 'silty', 'sandy', 'medium']).nullable() });
const artifactSchema = z.object({ schemaVersion: z.literal(1), id: z.string(), status: z.enum(['available', 'partial']), generatedAt: z.string().datetime(), classification: z.literal('estimated'), aggregation: z.string(), provider: z.string(), license: z.literal('CC BY 4.0'), citation: z.string(), resolutionM: z.literal(5000), coverage: z.object({ totalMunicipalities: z.literal(5571), completeMunicipalities: z.number().int().nonnegative() }), entries: z.record(z.string(), entrySchema), limitations: z.array(z.string()) });
const artifact = artifactSchema.parse(artifactJson);

export type MunicipalSoilAttribute = { value: number | null; unit: string };
export type MunicipalSoilProfile = { status: 'available' | 'unavailable'; classification: 'estimated' | 'unknown'; artifactId: string; generatedAt: string; municipality: { code: string; name: string; uf: string } | null; referencePoint: { latitude: number; longitude: number } | null; depthCm: { min: 0; max: 30 }; resolutionM: 5000; textureClass: 'very_clayey' | 'clayey' | 'silty' | 'sandy' | 'medium' | null; attributes: Record<z.infer<typeof attributeIdSchema>, MunicipalSoilAttribute>; source: { provider: string; license: 'CC BY 4.0'; citation: string }; limitations: string[] };
const emptyAttributes = (): MunicipalSoilProfile['attributes'] => Object.fromEntries(attributeIdSchema.options.map((id) => [id, { value: null, unit: id === 'phh2o' ? 'pH' : id === 'soc' ? 'g/kg' : id === 'cec' ? 'cmol(c)/kg' : id === 'bdod' ? 'kg/dm3' : '%' }])) as MunicipalSoilProfile['attributes'];

/** Constant-time lookup after IBGE polygon resolution. Never substitutes another municipality or a nearest available point. */
export function resolveMunicipalSoilProfile(location: Coordinates): MunicipalSoilProfile {
  const municipality = resolveBrazilMunicipality(location); const entry = municipality ? artifact.entries[municipality.code] : undefined; const complete = entry && Object.values(entry.attributes).every((attribute) => attribute.value !== null);
  const base = { artifactId: artifact.id, generatedAt: artifact.generatedAt, depthCm: { min: 0 as const, max: 30 as const }, resolutionM: 5000 as const, source: { provider: artifact.provider, license: artifact.license, citation: artifact.citation }, limitations: artifact.limitations };
  if (!entry || !complete) return { ...base, status: 'unavailable', classification: 'unknown', municipality, referencePoint: entry ? { latitude: entry.referencePoint.latitude, longitude: entry.referencePoint.longitude } : null, textureClass: null, attributes: entry ? entry.attributes as MunicipalSoilProfile['attributes'] : emptyAttributes() };
  return { ...base, status: 'available', classification: 'estimated', municipality: entry.municipality, referencePoint: { latitude: entry.referencePoint.latitude, longitude: entry.referencePoint.longitude }, textureClass: entry.textureClass, attributes: entry.attributes as MunicipalSoilProfile['attributes'] };
}
