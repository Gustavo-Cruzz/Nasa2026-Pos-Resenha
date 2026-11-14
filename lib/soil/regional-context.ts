import type { Coordinates } from '@/lib/schema';

export type RegionalSoilAttribute = { id: 'phh2o' | 'clay' | 'sand' | 'silt' | 'soc' | 'cec' | 'bdod' | 'wv003' | 'wv1500'; value: null; unit: null; depthCm: null; resolutionM: null; uncertainty: null };
export type RegionalSoilContext = { status: 'available' | 'unavailable'; classification: 'estimated' | 'unknown'; location: Coordinates; providers: Array<'SoilGrids' | 'MapBiomas Solo'>; attributes: RegionalSoilAttribute[]; limitations: string[] };

const ids: RegionalSoilAttribute['id'][] = ['phh2o', 'clay', 'sand', 'silt', 'soc', 'cec', 'bdod', 'wv003', 'wv1500'];

/**
 * Adapter boundary for licensed/preprocessed spatial soil data. SoilGrids REST is
 * intentionally never called: it is suspended and would not provide verified
 * point-scale farmer measurements. Add an `available` implementation only after
 * committing a compatible artifact with source, depth, units, resolution and uncertainty.
 */
export function resolveRegionalSoilContext(location: Coordinates): RegionalSoilContext {
  return { status: 'unavailable', classification: 'unknown', location, providers: ['SoilGrids', 'MapBiomas Solo'], attributes: ids.map((id) => ({ id, value: null, unit: null, depthCm: null, resolutionM: null, uncertainty: null })), limitations: ['No verified compatible preprocessed SoilGrids or MapBiomas Solo artifact is loaded for this coordinate.', 'SoilGrids REST is suspended and is not called.', 'A regional estimate must remain separate from a local laboratory measurement.'] };
}
