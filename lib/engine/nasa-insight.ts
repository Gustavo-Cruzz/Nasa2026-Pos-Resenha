import { cropById, type Crop } from '@/lib/catalog';
import type { ClimateContext } from '@/lib/climate/nasa-power';
import { slotWindow, windowThermal } from '@/lib/engine/slot-window';
import type { NasaInsight, NasaInsightEffect, Rotation } from '@/lib/engine/types';

const UNKNOWN_LIMIT = 'Clima histórico e faixa térmica documentada são necessários para comparar cenários.';
const PRECIP_LIMIT = 'Precipitação histórica é observação climática; não representa demanda hídrica, aptidão ou necessidade de irrigação.';

function unknownEffects(strategies: Rotation[]): NasaInsightEffect[] {
  return strategies.map((strategy) => ({ scenarioId: strategy.id, cropId: strategy.proposedCrop?.cropId ?? null, cropName: strategy.proposedCrop?.name ?? null, state: 'unknown', ruleId: 'MISSING_CLIMATE_EVIDENCE', documentedRangeC: null, sourceRefs: [] }));
}

/**
 * `ownWindow` (planting-month insight only): a scenario whose distinguishing crop starts in another month (safrinha)
 * is read in that crop's own window instead of the planting month; an unknown safrinha month stays unknown.
 * The per-month insights (calendar) never use it, since each of their months is read for every scenario.
 */
export function deriveNasaInsight(strategies: Rotation[], climate: ClimateContext, month: number, options: { ownWindow?: boolean } = {}): NasaInsight {
  const provenance = climate.provenance;
  const temperature = climate.monthly.find((item) => item.month === month)?.tmeanMedianC ?? null;
  const precipitation = climate.historicalPrecipitationByMonth.find((item) => item.month === month);
  const sourceUrl = provenance?.sourceUrl ?? null;
  const period = provenance?.period ?? null;

  if (climate.status === 'available' && temperature !== null) {
    const effects = strategies.map<NasaInsightEffect>((strategy) => {
      const crop = strategy.proposedCrop ? cropById.get(strategy.proposedCrop.cropId as Crop['id']) : undefined;
      const range = crop?.viableTempC ?? null;
      const refs = [...new Set([...(sourceUrl ? [sourceUrl] : []), ...(range ? crop?.sourceRefs ?? [] : [])])];
      const cropMonth = strategy.proposedCrop?.plantingMonth;
      if (options.ownWindow && strategy.proposedCrop && cropMonth !== month) {
        if (cropMonth === null || cropMonth === undefined) return { scenarioId: strategy.id, cropId: crop?.id ?? null, cropName: strategy.proposedCrop.name, state: 'unknown', ruleId: 'MISSING_CLIMATE_EVIDENCE', documentedRangeC: range, sourceRefs: refs, evaluatedMonth: null, observedValueC: null, ownWindow: true };
        const window = slotWindow(crop, cropMonth, 'B'); const result = window ? windowThermal(window, crop, climate) : null;
        const shown = result ? result.observed.find((item) => item.month === (result.outOfRangeMonths[0] ?? cropMonth)) : undefined;
        return { scenarioId: strategy.id, cropId: crop?.id ?? null, cropName: strategy.proposedCrop.name, state: result?.state ?? 'unknown', ruleId: range ? 'DOCUMENTED_THERMAL_RANGE' : 'MISSING_CLIMATE_EVIDENCE', documentedRangeC: range, sourceRefs: refs, evaluatedMonth: shown?.month ?? cropMonth, observedValueC: shown?.tmeanC ?? null, ownWindow: true };
      }
      const state = range ? temperature >= range.min && temperature <= range.max ? 'compatible' : 'attention' : 'unknown';
      return { scenarioId: strategy.id, cropId: crop?.id ?? null, cropName: strategy.proposedCrop?.name ?? null, state, ruleId: range ? 'DOCUMENTED_THERMAL_RANGE' : 'MISSING_CLIMATE_EVIDENCE', documentedRangeC: range, sourceRefs: refs };
    });
    const comparableStates = new Set(effects.filter((effect) => effect.state !== 'unknown').map((effect) => effect.state));
    const comparableCount = effects.filter((effect) => effect.state !== 'unknown').length;
    const changesComparison = comparableStates.size > 1;
    if (comparableCount > 0) {
      const attention = effects.find((effect) => effect.state === 'attention' && effect.documentedRangeC);
      const attentionDecision = attention?.documentedRangeC ? { scenarioId: attention.scenarioId, cropId: attention.cropId, cropName: attention.cropName, observedValue: attention.observedValueC ?? temperature, documentedRangeC: attention.documentedRangeC, ruleId: 'DOCUMENTED_THERMAL_RANGE' as const, sourceRefs: attention.sourceRefs } : null;
      return { status: changesComparison ? 'contrast' : 'shared_signal', month, metric: 'temperature', observedValue: temperature, unit: '°C', period, coveragePct: provenance?.coveragePct.T2M ?? null, changesComparison, effects, attentionDecision, limitations: ['Comparação exploratória com faixas térmicas documentadas; não é recomendação agronômica.'], sourceUrl };
    }
  }

  if (climate.status === 'available' && precipitation?.medianTotalMm !== null && precipitation) {
    const effects = strategies.map<NasaInsightEffect>((strategy) => ({ scenarioId: strategy.id, cropId: strategy.proposedCrop?.cropId ?? null, cropName: strategy.proposedCrop?.name ?? null, state: 'observed', ruleId: 'HISTORICAL_PRECIPITATION_ONLY', documentedRangeC: null, sourceRefs: sourceUrl ? [sourceUrl] : [] }));
    return { status: 'observational', month, metric: 'precipitation', observedValue: precipitation.medianTotalMm, unit: 'mm', period, coveragePct: precipitation.coveragePct, changesComparison: false, effects, attentionDecision: null, limitations: [PRECIP_LIMIT], sourceUrl };
  }

  return { status: 'unknown', month, metric: 'unavailable', observedValue: null, unit: null, period, coveragePct: null, changesComparison: false, effects: unknownEffects(strategies), attentionDecision: null, limitations: [UNKNOWN_LIMIT], sourceUrl };
}

export function deriveNasaInsights(strategies: Rotation[], climate: ClimateContext): NasaInsight[] {
  return Array.from({ length: 12 }, (_, index) => deriveNasaInsight(strategies, climate, index + 1));
}
