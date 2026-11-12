import { analysisInputSchema, type AnalysisInput } from '@/lib/schema';
import { isPilotLocation } from '@/lib/region';
import scope from '@/data/s2-scope.json';
import zarc from '@/data/rio-verde-zarc.json';
import type { AnalysisResult, Explanation, Rotation } from '@/lib/engine/types';

const ZARC_SOURCE = 'data/rio-verde-zarc.json';
const addMonths = (yearMonth: string, months: number) => { const [year, month] = yearMonth.split('-').map(Number); const date = new Date(Date.UTC(year, month - 1 + months, 1)); return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`; };

export function validateInputs(input: unknown) { return analysisInputSchema.safeParse(input); }
export function evaluateConstraints(input: AnalysisInput): Explanation[] {
  if (!isPilotLocation(input.location)) return [{ kind: 'limitation', message: 'Regional rules are unavailable outside the Rio Verde pilot.', ruleId: 'SCOPE_GLOBAL_CLIMATE_ONLY', sourceRefs: [], certainty: 'high', missingData: ['pilot_region'] }];
  return [];
}
function unavailable(id: 'B' | 'C', title: string, reason: string): Rotation { return { id, title, baseline: false, baselineAssumed: false, horizonMonths: 24, timeline: [], feasibility: 'unknown', score: null, metrics: [], explanations: [{ kind: 'limitation', message: reason, ruleId: 'EVIDENCE_INSUFFICIENT', sourceRefs: [ZARC_SOURCE], certainty: 'high', missingData: ['validated_regional_template'] }], missingData: ['validated_regional_template'], unavailable: true }; }
export function generateCandidates(input: AnalysisInput): Rotation[] {
  const last = input.history.at(-1)!; const cropId = last.cropId ?? 'unknown'; const start = addMonths(last.endYearMonth, 1); const assumed = !input.futureBaseline?.confirmed;
  const baseline: Rotation = { id: 'A', title: assumed ? 'Presumed continuation — confirm' : 'Farmer baseline', baseline: true, baselineAssumed: assumed, horizonMonths: 24, timeline: [{ cropIds: [cropId], startYearMonth: start, endYearMonth: addMonths(start, 23), mode: 'single' }], feasibility: 'unknown', score: null, metrics: [], explanations: [{ kind: 'limitation', message: assumed ? 'Baseline is inferred from the last recorded crop and must be confirmed.' : 'Baseline comes from the confirmed farmer plan.', ruleId: 'BASELINE_EXPLICIT', sourceRefs: [], certainty: assumed ? 'low' : 'high', missingData: assumed ? ['futureBaseline'] : [] }], missingData: assumed ? ['futureBaseline'] : [] };
  const covered = new Set(zarc.windows.map((window) => window.cropId));
  const available = scope.auditedPilotCandidates.filter((id) => covered.has(id));
  return [baseline, unavailable('B', 'Coverage / soil focus alternative', `No validated regional template exists. Audited ZARC crops: ${available.join(', ')}.`), unavailable('C', 'Lower water-pressure alternative', 'No validated comparative water rule or regional template exists for this alternative.')];
}
export function computeMetrics(candidate: Rotation): Rotation { return candidate; }
export function rankCandidates(candidates: Rotation[]): Rotation[] { return candidates.map((candidate) => ({ ...candidate, score: null })); }
export function explain(candidate: Rotation): Explanation[] { return candidate.explanations; }
export function analyze(input: unknown): AnalysisResult {
  const parsed = validateInputs(input); if (!parsed.success) throw new Error(parsed.error.issues.map((issue) => issue.message).join('; '));
  const warnings = evaluateConstraints(parsed.data); if (warnings.length) return { scope: 'global_climate_only', strategies: [], warnings: warnings.map((warning) => warning.message), input: parsed.data };
  return { scope: 'pilot_recommendation', strategies: rankCandidates(generateCandidates(parsed.data).map(computeMetrics)), warnings: [], input: parsed.data };
}
