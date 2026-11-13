import type { AnalysisInput } from '@/lib/schema';
import type { Crop } from '@/lib/catalog';
import type { ClimateContext } from '@/lib/climate/nasa-power';
import type { IndicatorState, QualitativeIndicator } from '@/lib/engine/types';

/** Shared qualitative rules used by both scenario summaries and individual lab slots. */
export function assessCropIndicators(crop: Crop | undefined, previousCrop: Crop | undefined, input: AnalysisInput, climate: ClimateContext): QualitativeIndicator[] {
  const thermal: IndicatorState = !crop?.viableTempC || climate.status !== 'available' ? 'unknown' : (() => { const observed = climate.monthly.find((item) => item.month === input.plantingMonth)?.tmeanMedianC; return observed === null || observed === undefined ? 'unknown' : observed >= crop.viableTempC.min && observed <= crop.viableTempC.max ? 'compatible' : 'attention'; })();
  const rain = climate.plantingMonthPrecipitation;
  const diversity: IndicatorState = !crop || !previousCrop ? 'unknown' : crop.family === previousCrop.family ? 'attention' : 'compatible';
  const soil: IndicatorState = input.soil?.ph === undefined || !crop?.soilPhRange ? 'unknown' : input.soil.ph >= crop.soilPhRange.min && input.soil.ph <= crop.soilPhRange.max ? 'compatible' : 'attention';
  return [
    { id: 'thermal_compatibility', label: 'Compatibilidade térmica', state: thermal, detail: thermal === 'unknown' ? 'Faixa térmica documentada e/ou clima histórico indisponível.' : 'Comparação exploratória com a climatologia mensal NASA.', sourceRefs: crop?.sourceRefs ?? [] },
    { id: 'historical_precipitation', label: 'Precipitação histórica no mês', state: rain?.medianTotalMm === null || !rain ? 'unknown' : 'observed', detail: rain?.medianTotalMm === null || !rain ? 'Sem observação histórica disponível.' : `${rain.medianTotalMm} mm (mediana histórica; cobertura de ${rain.coveragePct}%). Não é demanda hídrica.`, sourceRefs: climate.provenance ? [climate.provenance.sourceUrl] : [] },
    { id: 'cover_potential', label: 'Potencial de cobertura', state: !crop ? 'unknown' : crop.purposes.includes('cover') ? 'yes' : 'no', detail: !crop ? 'Sem cultura proposta.' : crop.purposes.includes('cover') ? 'Finalidade de cobertura catalogada; não estima carbono, N ou fertilidade.' : 'Finalidade de cobertura não catalogada.', sourceRefs: crop?.sourceRefs ?? [] },
    { id: 'functional_diversity', label: 'Diversidade funcional', state: diversity, detail: diversity === 'unknown' ? 'Família da cultura anterior ou proposta desconhecida.' : diversity === 'compatible' ? 'Família diferente da cultura anterior informada.' : 'Mesma família da cultura anterior informada.', sourceRefs: crop?.sourceRefs ?? [] },
    { id: 'soil_context', label: 'Contexto de solo (pH)', state: soil, detail: soil === 'unknown' ? 'pH informado e faixa de pH verificável são necessários.' : soil === 'compatible' ? 'pH informado dentro da faixa documentada.' : 'pH informado fora da faixa documentada.', sourceRefs: crop?.sourceRefs ?? [] },
  ];
}
