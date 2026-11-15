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

export function indicatorDisplay(indicator: QualitativeIndicator, locale: Locale): { label: string; detail: string } {
  if (locale === 'pt-BR') return indicator;
  const labels = { thermal_compatibility: 'Thermal compatibility', historical_precipitation: 'Historical precipitation in the month', rainfall_distribution: 'Historical rainfall distribution', root_zone_wetness: 'Relative root-zone wetness', documented_water_response: 'Documented crop water response', cover_potential: 'Cover potential', functional_diversity: 'Functional diversity', soil_context: 'Soil context (pH)' } as const;
  const detail = (() => {
    if (indicator.id === 'thermal_compatibility') return indicator.state === 'unknown' ? 'Documented thermal range and/or historical climate is unavailable.' : 'Exploratory comparison with NASA monthly climatology.';
    if (indicator.id === 'historical_precipitation') {
      if (indicator.state === 'unknown') return 'No historical observation is available.';
      const values = indicator.detail.match(/[\d.]+/g);
      return values?.length ? `${values[0]} mm (historical median; ${values[1] ?? 'N/D'}% coverage). This is not crop water demand.` : 'Historical observation available; this is not crop water demand.';
    }
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
