import type { AnalysisResult } from '@/lib/engine/types';

export type HeroState = 'attention' | 'compatible' | 'unknown';
export type NextCheck = 'confirm_baseline' | 'review_with_technician' | 'provide_data';
export type HeroItem = { scenarioId: 'A' | 'B' | 'C'; cropId: string | null; cropName: string | null; state: 'attention' | 'compatible' | 'unknown' | 'observed'; rangeC: { min: number; max: number } | null; ruleId: string; sourceRefs: string[]; /** Month and Tmean read for this scenario's crop when it was evaluated in its own (safrinha) window; absent for the planting-month reading. */ evaluatedMonth?: number | null; observedValueC?: number | null };
export type DecisionHero = {
  state: HeroState;
  month: number;
  observedValue: number | null;
  unit: string | null;
  period: { start: string; end: string } | null;
  sourceUrl: string | null;
  items: HeroItem[];
  /** Scenarios that have no thermal reading; they never count as compatible. */
  unreadScenarioIds: Array<'A' | 'B' | 'C'>;
  nextCheck: NextCheck;
};

/**
 * Condenses the planting-month NASA insight into one decision. Pure and non-scoring:
 * `attention` needs a documented range the NASA value falls outside of; `compatible` needs
 * every scenario to have a documented range containing the value; anything else is `unknown`.
 */
export function deriveDecisionHero(data: AnalysisResult): DecisionHero {
  const insight = data.nasaInsight;
  const effects = insight.effects;
  const attention = effects.filter((effect) => effect.state === 'attention' && effect.documentedRangeC);
  const unread = effects.filter((effect) => effect.state !== 'attention' && effect.state !== 'compatible');
  const thermal = insight.metric === 'temperature' && insight.observedValue !== null;
  const allCompatible = thermal && effects.length > 0 && effects.every((effect) => effect.state === 'compatible');
  const state: HeroState = thermal && attention.length > 0 ? 'attention' : allCompatible ? 'compatible' : 'unknown';
  const shown = state === 'attention' ? attention : state === 'compatible' ? effects : unread.length ? unread : effects;
  const baselineAssumed = data.strategies.some((strategy) => strategy.baselineAssumed);
  const nextCheck: NextCheck = state === 'unknown' ? 'provide_data' : baselineAssumed ? 'confirm_baseline' : 'review_with_technician';
  return {
    state,
    month: insight.month,
    observedValue: thermal ? insight.observedValue : null,
    unit: thermal ? insight.unit : null,
    period: insight.period,
    sourceUrl: insight.sourceUrl,
    items: shown.map((effect) => ({ scenarioId: effect.scenarioId, cropId: effect.cropId, cropName: effect.cropName, state: effect.state, rangeC: effect.documentedRangeC, ruleId: effect.ruleId, sourceRefs: effect.sourceRefs, ...(effect.ownWindow ? { evaluatedMonth: effect.evaluatedMonth ?? null, observedValueC: effect.observedValueC ?? null } : {}) })),
    unreadScenarioIds: unread.map((effect) => effect.scenarioId),
    nextCheck,
  };
}
