import type { Crop } from '@/lib/catalog';
import type { AnalysisInput, SoilProfile } from '@/lib/schema';
import type { SoilHealthIndicator } from '@/lib/engine/types';
import { REGIONAL_SOIL_NOTE, formatDecimal } from '@/lib/engine/indicators';

/**
 * Qualitative soil-health context. It intentionally does not estimate carbon gain,
 * N supply, fertility, erosion loss, or uncovered periods without compatible inputs.
 */
export function assessSoilHealth(input: AnalysisInput, candidate: Crop | undefined, history: Crop[], declaredCompanions: Crop[] = [], regionalSoil?: SoilProfile): SoilHealthIndicator[] {
  const sequence = [...history, ...(candidate ? [candidate] : []), ...declaredCompanions.filter((crop) => crop.id !== candidate?.id)];
  const cropIds = new Set(sequence.map((crop) => crop.id));
  const familyRepeat = candidate && history.at(-1) ? candidate.family === history.at(-1)!.family : undefined;
  const hasCover = candidate ? [candidate, ...declaredCompanions].some((crop) => crop.purposes.includes('cover')) : undefined;
  const carbon = input.soil?.organicCarbonGKg ?? input.soil?.organicMatterGKg;
  const regionalCarbon = carbon === undefined ? regionalSoil?.organicCarbonGKg : undefined;
  return [
    { id: 'species_diversity', label: 'Diversidade de espécies', state: sequence.length ? 'observed' : 'unknown', value: sequence.length ? cropIds.size : null, detail: sequence.length ? `${cropIds.size} espécie(s) catalogada(s) na sequência observada + hipótese${declaredCompanions.length ? ' + sistema composto declarado' : ''}; não é previsão de desempenho.` : 'A cultura proposta não possui perfil catalogado.', sourceRefs: sequence.flatMap((crop) => crop.sourceRefs), missingData: candidate ? [] : ['catalogued_crop'] },
    { id: 'family_repetition', label: 'Repetição de família', state: familyRepeat === undefined ? 'unknown' : familyRepeat ? 'attention' : 'yes', value: null, detail: familyRepeat === undefined ? 'Família da hipótese ou da cultura imediatamente anterior é desconhecida.' : familyRepeat ? 'A hipótese repete a família da cultura imediatamente anterior.' : 'A hipótese muda a família em relação à cultura imediatamente anterior.', sourceRefs: sequence.flatMap((crop) => crop.sourceRefs), missingData: familyRepeat === undefined ? ['previous_crop_family'] : [] },
    { id: 'cover_presence', label: 'Presença de cobertura', state: hasCover === undefined ? 'unknown' : hasCover ? 'yes' : 'no', value: null, detail: hasCover === undefined ? 'Sem cultura catalogada para avaliar a finalidade.' : hasCover ? 'Finalidade de cobertura catalogada. Não quantifica biomassa, carbono ou proteção efetiva.' : 'A finalidade de cobertura não está catalogada para esta hipótese.', sourceRefs: candidate?.sourceRefs ?? [], missingData: hasCover === undefined ? ['catalogued_crop'] : [] },
    { id: 'nitrogen_fixation_potential', label: 'Fixação biológica de nitrogênio', state: candidate?.nitrogenFixationPotential ? 'yes' : 'unknown', value: null, detail: candidate?.nitrogenFixationPotential ? `${candidate.nitrogenFixationPotential}. Potencial qualitativo; não estima kg de N.` : 'Potencial documentado indisponível para esta hipótese; a família botânica não é usada como substituto.', sourceRefs: candidate?.sourceRefs ?? [], missingData: candidate?.nitrogenFixationPotential ? [] : ['documented_nitrogen_fixation'] },
    { id: 'bare_soil_interval', label: 'Período potencialmente descoberto', state: 'unknown', value: null, detail: 'Exige datas compatíveis, duração documentada e manejo informado; não foi inferido.', sourceRefs: [], missingData: ['verified_dates', 'management'] },
    { id: 'erosion_protection_context', label: 'Contexto de proteção contra erosão', state: hasCover ? 'yes' : 'unknown', value: null, detail: hasCover ? 'Cobertura catalogada pode ser discutida com chuva e relevo; não calcula perda de solo nem proteção efetiva.' : 'Sem cobertura catalogada, chuva/relevo compatíveis e manejo, a proteção permanece desconhecida.', sourceRefs: candidate?.sourceRefs ?? [], missingData: hasCover ? ['management', 'field_cover'] : ['cover', 'management', 'terrain'] },
    { id: 'organic_carbon_context', label: 'Condição inicial de carbono orgânico', state: carbon === undefined && regionalCarbon === undefined ? 'unknown' : 'observed', value: carbon ?? regionalCarbon ?? null, detail: carbon !== undefined ? `Valor local informado (${input.soil?.organicCarbonGKg !== undefined ? 'carbono orgânico' : 'matéria orgânica'}); não projeta ganho futuro.` : regionalCarbon !== undefined ? `${REGIONAL_SOIL_NOTE}: carbono orgânico ${formatDecimal(regionalCarbon)} g/kg; não projeta ganho futuro.` : 'Carbono orgânico ou matéria orgânica local não informado.', sourceRefs: input.soil?.sourceRef ? [input.soil.sourceRef] : [], missingData: carbon === undefined ? ['local_organic_carbon'] : [], origin: carbon !== undefined ? 'farmer' : regionalCarbon !== undefined ? 'regional_estimate' : undefined },
  ];
}
