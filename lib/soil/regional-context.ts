import { z } from 'zod';
import rioVerdeArtifact from '@/data/soilgrids/rio-verde-0-5cm.json';
import type { Coordinates } from '@/lib/schema';

const attributeIdSchema = z.enum(['phh2o', 'clay', 'sand', 'silt', 'soc', 'cec', 'bdod', 'wv003', 'wv1500']);
const artifactSchema = z.object({
  id: z.string().min(1), status: z.literal('available'), classification: z.literal('estimated'), provider: z.string().min(1), license: z.string().min(1), licenseUrl: z.string().url(), citation: z.string().min(1), retrievedAt: z.string().datetime(), requestedLocation: z.object({ latitude: z.number(), longitude: z.number() }),
  attributes: z.array(z.object({ id: attributeIdSchema.exclude(['wv003', 'wv1500']), value: z.number(), unit: z.string().min(1), depthCm: z.object({ min: z.number(), max: z.number() }), resolutionM: z.number().positive(), uncertainty: z.object({ type: z.literal('90% prediction interval'), lower: z.number(), upper: z.number(), unit: z.string().min(1) }), sourceUrls: z.array(z.string().url()).min(3) })).min(1), limitations: z.array(z.string().min(1)).min(1),
});

const artifact = artifactSchema.parse(rioVerdeArtifact);
export type RegionalSoilAttribute = { id: z.infer<typeof attributeIdSchema>; value: number | null; unit: string | null; depthCm: { min: number; max: number } | null; resolutionM: number | null; uncertainty: { type: '90% prediction interval'; lower: number; upper: number; unit: string } | null; sourceUrls: string[] };
export type RegionalSoilContext = { status: 'available' | 'unavailable'; classification: 'estimated' | 'unknown'; location: Coordinates; providers: string[]; artifactId: string | null; retrievedAt: string | null; license: string | null; licenseUrl: string | null; citation: string | null; attributes: RegionalSoilAttribute[]; limitations: string[] };

const ids: RegionalSoilAttribute['id'][] = ['phh2o', 'clay', 'sand', 'silt', 'soc', 'cec', 'bdod', 'wv003', 'wv1500'];
const matchesExactArtifact = (location: Coordinates) => Math.abs(location.latitude - artifact.requestedLocation.latitude) < 1e-6 && Math.abs(location.longitude - artifact.requestedLocation.longitude) < 1e-6;

/** Versioned regional data boundary. The bundled 250 m estimate is exact-coordinate only; the paused REST API is never called. */
export function resolveRegionalSoilContext(location: Coordinates): RegionalSoilContext {
  if (matchesExactArtifact(location)) {
    const byId = new Map(artifact.attributes.map((item) => [item.id, item]));
    return { status: 'available', classification: 'estimated', location, providers: [artifact.provider], artifactId: artifact.id, retrievedAt: artifact.retrievedAt, license: artifact.license, licenseUrl: artifact.licenseUrl, citation: artifact.citation, attributes: ids.map((id) => { const item = id === 'wv003' || id === 'wv1500' ? undefined : byId.get(id); return item ? item : { id, value: null, unit: null, depthCm: null, resolutionM: null, uncertainty: null, sourceUrls: [] }; }), limitations: artifact.limitations };
  }
  return { status: 'unavailable', classification: 'unknown', location, providers: ['SoilGrids', 'MapBiomas Solo'], artifactId: null, retrievedAt: null, license: null, licenseUrl: null, citation: null, attributes: ids.map((id) => ({ id, value: null, unit: null, depthCm: null, resolutionM: null, uncertainty: null, sourceUrls: [] })), limitations: ['No verified compatible preprocessed SoilGrids or MapBiomas Solo artifact is loaded for this coordinate.', 'SoilGrids REST is suspended and is not called.', 'A regional estimate must remain separate from a local laboratory measurement.'] };
}
