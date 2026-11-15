import { p0Crops } from '@/lib/evidence-coverage';
import type { Explanation, PriorityAlignment, QualitativeIndicator, Rotation } from '@/lib/engine/types';
import type { Locale } from '@/lib/i18n';

export function cropDisplayName(cropId: string | null | undefined, fallback: string | null | undefined, locale: Locale): string {
  return (cropId ? p0Crops.find((crop) => crop.id === cropId)?.commonNames[locale] : undefined) ?? fallback ?? 'N/D';
}

export function scenarioDisplayTitle(strategy: Pick<Rotation, 'id' | 'title' | 'baselineAssumed'>, locale: Locale): string {
  if (locale === 'pt-BR') return strategy.title;
  if (strategy.id === 'A') return strategy.baselineAssumed ? 'Assumed continuity — confirm' : strategy.title === 'Plano atual (detectado no histórico)' ? 'Current plan (detected from history)' : 'Producer plan';
  if (strategy.id === 'B') return 'Soil health';
  const titles: Record<string, string> = { 'Menor exposição hídrica documentada': 'Lowest documented water exposure', 'Ciclo mais curto documentado': 'Shortest documented cycle', 'Diversificação': 'Diversification' };
  return titles[strategy.title] ?? 'Water context';
}

const MONTH_EN: Record<string, string> = { jan: 'Jan', fev: 'Feb', mar: 'Mar', abr: 'Apr', mai: 'May', jun: 'Jun', jul: 'Jul', ago: 'Aug', set: 'Sep', out: 'Oct', nov: 'Nov', dez: 'Dec' };
/** English rendering of the window indicator details (fixed phrases + month abbreviations + decimal point). */
export function windowDetailEn(detail: string): string {
  const phrases: Array<[string, string]> = [['Comparação exploratória com a climatologia mensal NASA em', 'Exploratory comparison with NASA monthly climatology in'], ['janela presumida de', 'assumed window of'], ['janela de', 'window of'], ['meses', 'months'], ['ciclo não documentado, duração presumida', 'cycle not documented, assumed duration'], ['ciclo documentado de até', 'documented cycle of up to'], ['dias', 'days'], ['Tmédia mediana', 'Median Tmean'], ['faixa documentada', 'documented range'], ['Fora da faixa em', 'Out of range in'], ['Sem leitura em', 'No reading in'], ['Todos os meses da janela dentro da faixa.', 'All window months are within the range.'], ['de P−ET0 acumulado em', 'of accumulated P−ET0 in'], ['soma das medianas mensais', 'sum of monthly medians'], ['Contexto climático (precipitação − ET0 FAO-56); não é demanda da cultura, ETc nem necessidade de irrigação.', 'Climate context (precipitation − FAO-56 ET0); not crop demand, ETc or irrigation need.'], ['Balanço P−ET0 indisponível em', 'P−ET0 balance unavailable in'], ['sem dados em', 'no data in'], ['Dias com chuva IMERG (mediana) em', 'IMERG rain days (median) in'], ['Não indica suficiência para a cultura.', 'It does not indicate crop sufficiency.'], ['Umidade da zona radicular (índice relativo 0–1, mediana) em', 'Root-zone wetness (relative index 0–1, median) in'], ['Grade regional modelada, não medição do talhão.', 'Modeled regional grid, not a field measurement.'], ['Risco de geada', 'Frost risk'], ['de ', 'of '], ['anos com Tmín', 'years with Tmin'], ['anos', 'years'], ['mediana', 'median'], ['dia(s)', 'day(s)'], ['Limiar de triagem de', 'Screening threshold of'], ['temperatura do ar, NASA POWER T2M_MIN', 'air temperature, NASA POWER T2M_MIN'], ['limiares de dano específicos de cada cultura não são modelados', 'crop-specific damage thresholds are not modelled'], ['Dados de Tmín indisponíveis para a', 'Tmin data unavailable for the'], ['em ', 'in ']];
  let text = detail; for (const [from, to] of phrases) text = text.split(from).join(to);
  return text.replace(/\b(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\b/g, (month) => MONTH_EN[month]!).replace(/(\d),(\d)/g, '$1.$2');
}

export function indicatorDisplay(indicator: QualitativeIndicator, locale: Locale): { label: string; detail: string } {
  if (locale === 'pt-BR') return indicator;
  const labels = { thermal_compatibility: 'Thermal compatibility', historical_precipitation: 'Historical precipitation in the month', rainfall_distribution: 'Historical rainfall distribution', root_zone_wetness: 'Relative root-zone wetness', window_water_balance: 'P−ET0 balance over the window', frost_risk: 'Frost risk (screening)', documented_water_response: 'Documented crop water response', cover_potential: 'Cover potential', functional_diversity: 'Functional diversity', soil_context: 'Soil context (pH)' } as const;
  const detail = (() => {
    if (indicator.id === 'thermal_compatibility') return indicator.state === 'unknown' && !indicator.detail.includes('janela') ? 'Documented thermal range and/or historical climate is unavailable.' : indicator.detail.includes('janela') ? windowDetailEn(indicator.detail) : 'Exploratory comparison with NASA monthly climatology.';
    if (indicator.id === 'window_water_balance' || indicator.id === 'frost_risk') return windowDetailEn(indicator.detail);
    if (indicator.id === 'historical_precipitation') {
      if (indicator.state === 'unknown') return 'No historical observation is available.';
      const values = indicator.detail.match(/[\d.]+/g);
      return values?.length ? `${values[0]} mm (historical median; ${values[1] ?? 'N/D'}% coverage). This is not crop water demand.` : 'Historical observation available; this is not crop water demand.';
    }
    if (indicator.id === 'rainfall_distribution' && indicator.detail.includes('janela')) return windowDetailEn(indicator.detail);
    if (indicator.id === 'root_zone_wetness' && indicator.detail.includes('janela')) return windowDetailEn(indicator.detail);
    if (indicator.id === 'rainfall_distribution') return indicator.state === 'unknown' ? 'GPM IMERG is unavailable for this series.' : indicator.detail.replace('dias com chuva registrada no mês mediano', 'days with recorded rain in the median month').replace('cobertura anual completa de', 'complete annual coverage of').replace('Não indica suficiência para a cultura.', 'It does not indicate crop sufficiency.');
    if (indicator.id === 'root_zone_wetness') return indicator.state === 'unknown' ? 'Root-zone wetness context is unavailable.' : indicator.detail.replace('índice relativo', 'relative index').replace('cobertura diária de', 'daily coverage of').replace('Grade regional modelada, não medição do talhão.', 'Modeled regional grid, not a field measurement.');
    if (indicator.id === 'documented_water_response') {
      if (indicator.detail.startsWith('Perfil Kc verificável indisponível')) return 'No verifiable Kc profile is available for this crop.';
      if (indicator.detail.includes('exposição NASA indisponível')) return indicator.detail.replace('Perfil Kc documentado disponível, mas exposição NASA indisponível.', 'A documented Kc profile is available, but NASA exposure is unavailable.').replace('Pico Kc', 'Peak Kc').replace('na fase', 'at stage');
      return indicator.detail.replace('Exposição histórica comum:', 'Shared historical exposure:').replace('zona radicular', 'root zone').replace('dias com chuva IMERG', 'IMERG rain days').replace('Referência específica da cultura:', 'Crop-specific reference:').replace('pico Kc', 'peak Kc').replace('na fase', 'at stage').replace('Não calcula ETc, consumo ou irrigação e não ranqueia estudos.', 'It does not calculate ETc, water use, or irrigation and does not rank studies.');
    }
    if (indicator.id === 'cover_potential') return indicator.state === 'unknown' ? 'No crop is proposed.' : indicator.state === 'yes' ? 'Cataloged cover purpose; does not estimate carbon, N, or fertility.' : 'Cover purpose is not cataloged.';
    if (indicator.id === 'functional_diversity') return indicator.state === 'unknown' ? 'The previous or proposed crop family is unknown.' : indicator.state === 'compatible' ? 'Different family from the previous informed crop.' : 'Same family as the previous informed crop.';
    if (indicator.origin === 'regional_estimate') {
      const ph = indicator.value === null || indicator.value === undefined ? 'N/D' : String(Math.round(indicator.value * 100) / 100); const range = indicator.detail.match(/\(([\d,]+)–([\d,]+)\)/);
      const tail = indicator.state === 'unknown' || !range ? 'crop range not documented' : `${indicator.state === 'compatible' ? 'within' : 'outside'} the crop's documented range (${range[1].replace(',', '.')}–${range[2].replace(',', '.')})`;
      return `Regional estimate (SoilGrids, municipal mean, 0–30 cm), not a field analysis. Regional pH ${ph} — ${tail}.`;
    }
    return indicator.state === 'unknown' ? 'Informed pH and a verifiable pH range are required.' : indicator.state === 'compatible' ? 'Informed pH is within the documented range.' : 'Informed pH is outside the documented range.';
  })();
  return { label: labels[indicator.id], detail };
}

export function explanationDisplay(explanation: Explanation, locale: Locale): string {
  if (locale === 'pt-BR') return explanation.message;
  if (explanation.ruleId === 'BASELINE_PRESUMED') return 'Assumed continuity based on the last event; confirm or edit this plan.';
  if (explanation.ruleId === 'BRAZIL_MUNICIPAL_ZARC_CONTEXT') return 'Municipal ZARC context is available; raw codes are preserved without interpretation.';
  if (explanation.ruleId === 'GLOBAL_EXPLORATION') return 'No applicable municipal ZARC context is available; global climate exploration remains available.';
  if (explanation.ruleId === 'SELECTION_GAP') return 'The minimum documented criteria were not available for crop selection.';
  if (explanation.ruleId === 'NASA_EXPOSURE_WITH_DOCUMENTED_KC') return 'Water context combines historical NASA exposure with a documented crop Kc profile. The source-specific profile does not calculate ETc, water use, irrigation, or water superiority.';
  if (explanation.ruleId === 'PRIORITY_RULE_APPLIED') return 'A priority-based selection rule was applied using documented catalog attributes only (qualitative; no score). See the Portuguese text for the exact attribute.';
  if (explanation.ruleId === 'PRIORITY_CRITERION_NOT_APPLIED') return 'Your dominant priority could not be applied because the needed crop attribute is not documented in the catalog; the default selection rule was used.';
  if (explanation.ruleId === 'REGIONAL_SOIL_ESTIMATE_ONLY') return 'No farmer soil analysis: pH comes from a regional estimate (SoilGrids, municipal mean, 0–30 cm), not from the field. Use a local analysis to decide.';
  return 'See the linked rule, evidence, and remaining gaps for this exploratory statement.';
}

const priorityLabels = { 'pt-BR': { water: 'Água', soil: 'Solo', operations: 'Operação' }, en: { water: 'Water', soil: 'Soil', operations: 'Operations' } } as const;
const levelLabels = { 'pt-BR': { supports: 'apoia', neutral: 'neutro', conflicts: 'conflita', unknown: 'sem dado' }, en: { supports: 'supports', neutral: 'neutral', conflicts: 'conflicts', unknown: 'no data' } } as const;
const levelIcons: Record<PriorityAlignment['level'], string> = { supports: '▲', neutral: '●', conflicts: '▼', unknown: '?' };

/** Qualitative display of one priority alignment (label, icon, reason); never a number. */
export function alignmentDisplay(alignment: PriorityAlignment, locale: Locale): { priority: string; level: string; icon: string; reason: string } {
  return { priority: priorityLabels[locale][alignment.priority], level: levelLabels[locale][alignment.level], icon: levelIcons[alignment.level], reason: locale === 'en' ? alignment.reasonEn : alignment.reason };
}

const MISSING_LABELS: Record<string, { pt: string; en: string }> = {
  window_water_balance: { pt: 'balanço hídrico da janela', en: 'window water balance' },
  documented_kc: { pt: 'Kc documentado', en: 'documented Kc' },
  residue_potential: { pt: 'potencial de palhada', en: 'residue potential' },
  documented_nitrogen_fixation: { pt: 'fixação de nitrogênio documentada', en: 'documented nitrogen fixation' },
  zarc_window: { pt: 'janela ZARC', en: 'ZARC window' },
  cycle_duration: { pt: 'duração do ciclo', en: 'cycle duration' },
  eligible_crop: { pt: 'cultura com critérios mínimos', en: 'crop meeting minimum criteria' },
  historical_climate: { pt: 'clima histórico', en: 'historical climate' },
  documented_temperature_range: { pt: 'faixa térmica documentada', en: 'documented thermal range' },
  soil_ph_or_verified_range: { pt: 'pH informado ou faixa verificável', en: 'informed pH or verifiable range' },
  unconfigured_lab_slots: { pt: 'slots ainda não configurados', en: 'unconfigured slots' },
  futureBaseline: { pt: 'plano futuro confirmado', en: 'confirmed future plan' },
  verified_dates: { pt: 'datas de plantio e colheita confirmadas', en: 'confirmed planting and harvest dates' },
  management: { pt: 'manejo da área', en: 'field management' },
  field_cover: { pt: 'cobertura do solo no talhão', en: 'field soil cover' },
  local_soil_analysis: { pt: 'análise de solo do talhão', en: 'local soil analysis' },
  regional_source: { pt: 'fonte regional de dados', en: 'regional data source' },
  documented_criteria: { pt: 'critérios mínimos documentados', en: 'documented minimum criteria' },
  pam_municipal: { pt: 'dados de produção municipal (PAM)', en: 'municipal production data (PAM)' },
  rainfall_erosivity: { pt: 'erosividade da chuva', en: 'rainfall erosivity' },
  residue_and_management: { pt: 'palhada e manejo', en: 'residue and management' },
  terrain_slope: { pt: 'declividade do terreno', en: 'terrain slope' },
  crop: { pt: 'cultura do slot', en: 'slot crop' },
  temperature: { pt: 'faixa térmica', en: 'thermal range' },
  cycle: { pt: 'duração documentada', en: 'documented duration' },
  soil_ph: { pt: 'contexto de pH', en: 'pH context' },
  previous_crop_family: { pt: 'família da cultura anterior', en: 'previous crop family' },
  smap_numeric_polygon_history: { pt: 'série histórica de umidade do solo (SMAP) para o polígono', en: 'soil-moisture history (SMAP) for the polygon' },
  catalogued_crop: { pt: 'cultura com perfil catalogado', en: 'crop with a cataloged profile' },
  cover: { pt: 'cobertura do solo', en: 'soil cover' },
  terrain: { pt: 'relevo do terreno', en: 'terrain' },
  local_organic_carbon: { pt: 'carbono orgânico ou matéria orgânica do talhão', en: 'local organic carbon or organic matter' },
  species_diversity: { pt: 'diversidade de espécies', en: 'species diversity' },
  family_repetition: { pt: 'repetição de família botânica', en: 'botanical family repetition' },
  cover_presence: { pt: 'presença de cobertura', en: 'cover presence' },
  nitrogen_fixation_potential: { pt: 'fixação biológica de nitrogênio', en: 'biological nitrogen fixation' },
  bare_soil_interval: { pt: 'período de solo descoberto', en: 'bare-soil interval' },
  erosion_protection_context: { pt: 'proteção contra erosão', en: 'erosion protection' },
  organic_carbon_context: { pt: 'carbono orgânico inicial', en: 'initial organic carbon' },
};

/** Plain-language label for a raw missing-data key; never exposes the key itself to the farmer. */
export function missingLabel(id: string, locale: Locale): string {
  const label = MISSING_LABELS[id];
  return label ? (locale === 'en' ? label.en : label['pt']) : (locale === 'en' ? 'additional evidence' : 'evidência adicional');
}

const SOIL_DETAIL_EN: Array<[string, string]> = [
  ['espécie(s) catalogada(s) na sequência observada + hipótese', 'cataloged species in the observed sequence + hypothesis'],
  ['espécie(s) catalogada(s) no histórico + sequência de 2 anos', 'cataloged species in the history + 2-year sequence'],
  [' + sistema composto declarado', ' + declared composite system'],
  ['não é previsão de desempenho', 'not a performance forecast'],
  ['A cultura proposta não possui perfil catalogado.', 'The proposed crop has no cataloged profile.'],
  ['Família da hipótese ou da cultura imediatamente anterior é desconhecida.', 'The family of the hypothesis or of the immediately preceding crop is unknown.'],
  ['A hipótese repete a família da cultura imediatamente anterior.', 'The hypothesis repeats the family of the immediately preceding crop.'],
  ['A hipótese muda a família em relação à cultura imediatamente anterior.', 'The hypothesis changes family relative to the immediately preceding crop.'],
  ['Repetição de família:', 'Family repetition:'],
  ['Sem repetição de família entre culturas consecutivas', 'No family repetition between consecutive crops'],
  ['Sem cultura catalogada para avaliar a finalidade.', 'No cataloged crop to assess the purpose.'],
  ['Finalidade de cobertura catalogada.', 'Cover purpose cataloged.'],
  ['Cobertura catalogada na sequência:', 'Cover cataloged in the sequence:'],
  ['Não quantifica biomassa, carbono ou proteção efetiva.', 'Does not quantify biomass, carbon or effective protection.'],
  ['A finalidade de cobertura não está catalogada para esta hipótese.', 'Cover purpose is not cataloged for this hypothesis.'],
  ['Nenhuma cultura da sequência', 'No crop in the sequence'],
  ['tem finalidade de cobertura catalogada', 'has a cataloged cover purpose'],
  ['Potencial qualitativo; não estima kg de N.', 'Qualitative potential; does not estimate kg of N.'],
  ['Potencial documentado indisponível para esta hipótese; a família botânica não é usada como substituto.', 'Documented potential unavailable for this hypothesis; botanical family is not used as a substitute.'],
  ['tem fixação de N documentada; a família botânica não é usada como substituto.', 'has documented N fixation; botanical family is not used as a substitute.'],
  ['Exige datas compatíveis, duração documentada e manejo informado; não foi inferido.', 'Requires compatible dates, documented duration and reported management; it was not inferred.'],
  ['Cobertura catalogada pode ser discutida com chuva e relevo; não calcula perda de solo nem proteção efetiva.', 'Cataloged cover can be discussed with rainfall and relief; it does not compute soil loss or effective protection.'],
  ['Sem cobertura catalogada, chuva/relevo compatíveis e manejo, a proteção permanece desconhecida.', 'Without cataloged cover, compatible rainfall/relief and management, protection remains unknown.'],
  ['Estimativa regional (SoilGrids, média municipal 0–30 cm), não é análise do talhão', 'Regional estimate (SoilGrids, municipal mean 0–30 cm), not a field soil analysis'],
  ['Valor local informado', 'Local value reported'],
  ['carbono orgânico', 'organic carbon'],
  ['matéria orgânica', 'organic matter'],
  ['não projeta ganho futuro', 'does not project future gain'],
  ['Carbono orgânico ou matéria orgânica local não informado.', 'Local organic carbon or organic matter not reported.'],
];
/** English rendering of the (pt-BR) soil-health indicator details produced by the engine. */
export function soilHealthDetailEn(detail: string): string {
  return SOIL_DETAIL_EN.reduce((text, [pt, en]) => text.split(pt).join(en), detail);
}
