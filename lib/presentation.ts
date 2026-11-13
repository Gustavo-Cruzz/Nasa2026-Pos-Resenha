import { p0Crops } from '@/lib/evidence-coverage';
import type { Explanation, QualitativeIndicator, Rotation } from '@/lib/engine/types';
import type { Locale } from '@/lib/i18n';

export function cropDisplayName(cropId: string | null | undefined, fallback: string | null | undefined, locale: Locale): string {
  return (cropId ? p0Crops.find((crop) => crop.id === cropId)?.commonNames[locale] : undefined) ?? fallback ?? 'N/D';
}

export function scenarioDisplayTitle(strategy: Pick<Rotation, 'id' | 'title' | 'baselineAssumed'>, locale: Locale): string {
  if (locale === 'pt-BR') return strategy.title;
  if (strategy.id === 'A') return strategy.baselineAssumed ? 'Assumed continuity — confirm' : 'Producer plan';
  return strategy.id === 'B' ? 'Soil health' : 'Water resilience';
}

export function indicatorDisplay(indicator: QualitativeIndicator, locale: Locale): { label: string; detail: string } {
  if (locale === 'pt-BR') return indicator;
  const labels = { thermal_compatibility: 'Thermal compatibility', historical_precipitation: 'Historical precipitation in the month', cover_potential: 'Cover potential', functional_diversity: 'Functional diversity', soil_context: 'Soil context (pH)' } as const;
  const detail = (() => {
    if (indicator.id === 'thermal_compatibility') return indicator.state === 'unknown' ? 'Documented thermal range and/or historical climate is unavailable.' : 'Exploratory comparison with NASA monthly climatology.';
    if (indicator.id === 'historical_precipitation') {
      if (indicator.state === 'unknown') return 'No historical observation is available.';
      const values = indicator.detail.match(/[\d.]+/g);
      return values?.length ? `${values[0]} mm (historical median; ${values[1] ?? 'N/D'}% coverage). This is not crop water demand.` : 'Historical observation available; this is not crop water demand.';
    }
    if (indicator.id === 'cover_potential') return indicator.state === 'unknown' ? 'No crop is proposed.' : indicator.state === 'yes' ? 'Cataloged cover purpose; does not estimate carbon, N, or fertility.' : 'Cover purpose is not cataloged.';
    if (indicator.id === 'functional_diversity') return indicator.state === 'unknown' ? 'The previous or proposed crop family is unknown.' : indicator.state === 'compatible' ? 'Different family from the previous informed crop.' : 'Same family as the previous informed crop.';
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
  return 'See the linked rule, evidence, and remaining gaps for this exploratory statement.';
}
