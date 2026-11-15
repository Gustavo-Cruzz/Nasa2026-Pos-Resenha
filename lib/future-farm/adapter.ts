import { cropById } from '@/lib/catalog';
import type { AnalysisResult, QualitativeIndicator, Rotation } from '@/lib/engine/types';
import type { Locale } from '@/lib/i18n';
import type { LabPlan } from '@/lib/lab';
import type { LabSlotAssessment } from '@/lib/lab/assessment';
import { summarizeCroppingSystem, type CroppingSystem } from '@/lib/intercrops';
import { explanationDisplay, indicatorDisplay, scenarioDisplayTitle } from '@/lib/presentation';
import { futureFarmCopy } from '@/lib/future-farm/copy';
import type { CropPresence, EvidenceLink, FarmCycleView, FarmScenarioView, ScenarioId } from '@/lib/future-farm/types';

export interface FutureFarmSources {
  /** Server analysis produced by the existing engine (read only). */
  analysis: AnalysisResult;
  /** The farmer's current laboratory plan from the draft; the scene always follows it. */
  currentPlan?: LabPlan;
  /** Current declared cropping systems from the draft (falls back to the analysed input). */
  croppingSystems?: CroppingSystem[];
}

export function cropLabel(cropId: string, locale: Locale): { label: string; known: boolean } {
  const crop = cropById.get(cropId);
  return crop ? { label: crop.commonNames[locale], known: true } : { label: `${futureFarmCopy(locale).unknownCrop} (${cropId})`, known: false };
}

/** Host plus the last path segment, so several documents from one institution stay distinguishable. */
function link(url: string): EvidenceLink {
  try {
    const parsed = new URL(url); const host = parsed.hostname.replace(/^www\./, '');
    const tail = decodeURIComponent(parsed.pathname.split('/').filter(Boolean).at(-1) ?? '');
    return { title: tail ? `${host} · ${tail.length > 48 ? `${tail.slice(0, 47)}…` : tail}` : host, url };
  } catch { return { title: url, url }; }
}
function unique<T>(items: T[]): T[] { return [...new Set(items)]; }

function intercropCompanions(cropId: string, systems: CroppingSystem[], locale: Locale) {
  const copy = futureFarmCopy(locale);
  const related = systems.filter((system) => system.type === 'intercrop' && system.events.some((event) => event.cropId === cropId));
  const companions: CropPresence[] = [];
  const notes: string[] = []; const risks: string[] = []; const sources: string[] = [];
  for (const system of related) {
    const others = system.events.filter((event) => event.cropId !== cropId);
    for (const event of others) if (!companions.some((item) => item.cropId === event.cropId) && event.cropId !== cropId) companions.push({ cropId: event.cropId, ...cropLabel(event.cropId, locale), role: 'intercrop', systemPlotId: system.plotId });
    const start = system.events.map((event) => event.startYearMonth).sort()[0]; const end = system.events.map((event) => event.endYearMonth).sort().at(-1);
    notes.push(copy.intercrop(system.plotId, `${start} → ${end}`, others.map((event) => cropLabel(event.cropId, locale).label).join(', ')));
    const summary = summarizeCroppingSystem(system, cropId);
    risks.push(...summary.risks, ...summary.limitations); sources.push(...summary.sourceRefs);
  }
  return { companions, notes, risks, sources };
}

function indicatorLines(indicators: QualitativeIndicator[], states: QualitativeIndicator['state'][], locale: Locale): string[] {
  return indicators.filter((indicator) => indicator.id !== 'functional_diversity' && states.includes(indicator.state)).map((indicator) => { const display = indicatorDisplay(indicator, locale); return `${display.label}: ${display.detail}`; });
}

interface CycleInput { scenarioId: ScenarioId; index: number; period: FarmCycleView['period']; cropId: string; assessment: Pick<LabSlotAssessment, 'indicators' | 'sourceRefs' | 'missingEvidence' | 'validationLevel'> | null; stale: boolean }

function buildCycle(input: CycleInput, systems: CroppingSystem[], locale: Locale): FarmCycleView {
  const copy = futureFarmCopy(locale);
  const primary: CropPresence = { cropId: input.cropId, ...cropLabel(input.cropId, locale), role: 'primary' };
  const intercrop = intercropCompanions(input.cropId, systems, locale);
  const crops = [primary, ...intercrop.companions];
  const catalogue = crops.map((crop) => cropById.get(crop.cropId));
  const functions = crops.map((crop, index) => ({ cropId: crop.cropId, purposes: (catalogue[index]?.purposes ?? []).map((purpose) => copy.purposes[purpose] ?? purpose), family: catalogue[index]?.family ?? null }));
  const knownRisks = catalogue.flatMap((crop) => crop ? crop.knownRisks.map((risk) => `${copy.knownRisk} (${crop.commonNames[locale]}): ${risk}`) : []);
  const catalogueRefs = catalogue.flatMap((crop) => crop?.sourceRefs ?? []);
  const evidence = input.stale ? null : input.assessment;
  const diversity = evidence?.indicators.find((indicator) => indicator.id === 'functional_diversity');
  return {
    id: `${input.scenarioId}-${input.index}`,
    index: input.index,
    period: input.period,
    crops,
    functions,
    sequenceNote: diversity ? indicatorDisplay(diversity, locale).detail : null,
    potentialBenefits: evidence ? indicatorLines(evidence.indicators, ['compatible', 'yes'], locale) : [],
    risksAndUnknowns: unique([...(evidence ? indicatorLines(evidence.indicators, ['attention'], locale).map((line) => `${copy.attention} — ${line}`) : []), ...knownRisks, ...intercrop.risks]),
    missingData: evidence ? evidence.missingEvidence.map((item) => copy.slotMissing[item] ?? item) : [],
    evidenceLevel: evidence?.validationLevel ?? null,
    evidenceLinks: unique([...(evidence?.sourceRefs ?? []), ...intercrop.sources, ...catalogueRefs]).map(link),
    intercropNotes: intercrop.notes,
    evidenceStale: input.stale,
    sceneMode: 'illustrative',
    measuredFieldCondition: null,
  };
}

function scenarioCycles(strategy: Rotation, plan: LabPlan | undefined, systems: CroppingSystem[], locale: Locale): FarmCycleView[] {
  const planned = plan?.scenarios.find((scenario) => scenario.id === strategy.id);
  if (planned) {
    return planned.slots.flatMap((slot, index) => {
      if (!slot.cropId) return []; // never invent a crop for an empty stage
      const analysed = strategy.slots.find((item) => item.slotIndex === index);
      const stale = !analysed || analysed.cropId !== slot.cropId;
      return [buildCycle({ scenarioId: strategy.id, index, period: { year: slot.year, season: slot.season }, cropId: slot.cropId, assessment: analysed ?? null, stale }, systems, locale)];
    });
  }
  if (strategy.slots.length) {
    return strategy.slots.flatMap((slot) => slot.cropId ? [buildCycle({ scenarioId: strategy.id, index: slot.slotIndex, period: { year: slot.year, season: slot.season }, cropId: slot.cropId, assessment: slot, stale: false }, systems, locale)] : []);
  }
  if (!strategy.proposedCrop) return [];
  const sourceRefs = unique(strategy.indicators.flatMap((indicator) => indicator.sourceRefs));
  return [buildCycle({ scenarioId: strategy.id, index: 0, period: null, cropId: strategy.proposedCrop.cropId, assessment: { indicators: strategy.indicators, sourceRefs, missingEvidence: [], validationLevel: strategy.validationLevel }, stale: false }, systems, locale)];
}

/**
 * Read-only adapter from the existing engine output to the story view.
 * Preserves A/B/C order, the real slot order and gaps, persisted crop IDs
 * and intercrop declarations. It does not score, rank or recompute anything.
 */
export function buildFarmScenarioViews({ analysis, currentPlan, croppingSystems }: FutureFarmSources, locale: Locale): FarmScenarioView[] {
  const copy = futureFarmCopy(locale);
  const systems = croppingSystems ?? analysis.input.croppingSystems ?? [];
  return (['A', 'B', 'C'] as const).flatMap((id) => {
    const strategy = analysis.strategies.find((item) => item.id === id);
    if (!strategy) return [];
    return [{
      id,
      title: scenarioDisplayTitle(strategy, locale),
      scenarioNotes: strategy.explanations.map((item) => explanationDisplay(item, locale)),
      scenarioMissingData: unique(strategy.missingData.map((item) => copy.scenarioMissing[item] ?? item)),
      cycles: scenarioCycles(strategy, currentPlan, systems, locale),
      demoOnly: false,
    }];
  });
}

/** Stable key-order JSON used to tell whether a cached analysis matches the current draft input. */
export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().filter((key) => (value as Record<string, unknown>)[key] !== undefined).map((key) => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
