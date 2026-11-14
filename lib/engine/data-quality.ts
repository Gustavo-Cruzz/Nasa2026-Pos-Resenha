import type { ClimateContext } from '@/lib/climate/nasa-power';
import type { AnalysisInput } from '@/lib/schema';
import type { DataQualityRecord } from '@/lib/engine/types';

/** Provenance vocabulary for every result layer; values are never upgraded by inference. */
export function deriveDataQuality(input: AnalysisInput, climate: ClimateContext): DataQualityRecord[] {
  const soilClassification = input.soil?.origin === 'farmer_lab' ? 'measured' : input.soil?.origin === 'regional_estimate' ? 'estimated' : 'unknown';
  return [
    { id: 'nasa_historical_climate', label: 'Observação climática NASA', classification: climate.status === 'available' ? 'observed' : 'unknown', formula: null, unit: null, inputs: ['NASA POWER daily point series'], sourceRefs: climate.provenance ? [climate.provenance.sourceUrl] : [], uncertainty: 'Grid context; not a field measurement.', limitations: ['Grid observation/context, not a farm measurement or forecast.'] },
    { id: 'farmer_soil', label: 'Solo do produtor', classification: soilClassification, formula: null, unit: null, inputs: input.soil ? Object.keys(input.soil).filter((key) => !['origin', 'sourceRef'].includes(key)) : [], sourceRefs: input.soil?.sourceRef ? [input.soil.sourceRef] : [], uncertainty: input.soil?.origin === 'farmer_lab' ? 'Sampling, laboratory method and sample depth must be interpreted together.' : input.soil?.origin === 'regional_estimate' ? 'Spatial estimate is not a local sample.' : null, limitations: input.soil?.origin === 'farmer_lab' ? ['Local laboratory values are not mixed with regional estimates.'] : input.soil?.origin === 'regional_estimate' ? ['Regional estimate must remain distinct from local measurement.'] : ['No compatible local or verified regional soil observation.'] },
    { id: 'soil_health_context', label: 'Contexto de saúde do solo', classification: 'derived', formula: 'Species count; immediate-family comparison; documented crop purpose; reported initial carbon/matter.', unit: 'qualitative', inputs: ['catalogued crop sequence', 'farmer soil input'], sourceRefs: [], uncertainty: 'Depends on documented crop sequence and farmer-provided soil context.', limitations: ['Does not estimate carbon gain, N supply, fertility, erosion loss, yield, or irrigation.'] },
    { id: 'rotation_hypotheses', label: 'Hipóteses de rotação A/B/C', classification: 'scenario', formula: null, unit: null, inputs: ['producer baseline', 'operational crop profile', 'catalogue constraints'], sourceRefs: [], uncertainty: 'Not a probability or agronomic recommendation.', limitations: ['Exploratory scenarios are not recommendations or forecasts.'] },
  ];
}
