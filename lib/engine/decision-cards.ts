import type { AnalysisResult, PriorityAlignment, Rotation } from '@/lib/engine/types';
import { missingLabel } from '@/lib/presentation';
import { AXIS_LABELS, type TradeoffAxis } from '@/lib/engine/tradeoffs';

/**
 * Pure view-model for the decision-first /results cards. Everything is derived from the engine output
 * (slots, tradeoffs matrix, missing data); nothing is invented. Missing pieces stay empty so the UI shows N/D.
 */
export type CardLocale = 'pt-BR' | 'en';
export type CardSlot = { slotIndex: number; year: 1 | 2; season: 'A' | 'B'; cropId: string | null; cropName: string | null };
export type CardDeltaItem = { slotIndex: number; year: 1 | 2; season: 'A' | 'B'; fromId: string | null; fromName: string | null; toId: string | null; toName: string | null };
export type CardAxisNote = { axis: TradeoffAxis; label: string; text: string };
export type CardHonesty = { know: string[]; missing: string[]; validate: string[] };
export type ScenarioCard = {
  id: Rotation['id'];
  baseline: boolean;
  sequence: CardSlot[];
  benefits: string[];
  risks: string[];
  gaps: string[];
  alignment: PriorityAlignment[];
  /** Slot-by-slot crop changes against A; empty for A itself or when the slots are identical. */
  delta: CardDeltaItem[];
  honesty: CardHonesty;
};

export const MAX_CARD_ITEMS = 3;

export function humanizeMissing(id: string, locale: CardLocale): string {
  return missingLabel(id, locale);
}

const dedupe = (items: string[]) => [...new Set(items.filter(Boolean))];

export function buildCardDelta(base: Rotation | undefined, scenario: Rotation): CardDeltaItem[] {
  if (!base || scenario.id === base.id) return [];
  return (scenario.slots ?? []).flatMap((slot) => {
    const before = (base.slots ?? []).find((item) => item.slotIndex === slot.slotIndex);
    if ((before?.cropId ?? null) === (slot.cropId ?? null)) return [];
    return [{ slotIndex: slot.slotIndex, year: slot.year, season: slot.season, fromId: before?.cropId ?? null, fromName: before?.cropName ?? null, toId: slot.cropId ?? null, toName: slot.cropName ?? null }];
  });
}

export function buildCardHonesty(scenario: Rotation, locale: CardLocale): CardHonesty {
  const en = locale === 'en';
  const cells = scenario.tradeoffs?.cells ?? [];
  const lang = en ? 'en' : 'pt';
  const know = cells.filter((cell) => cell.level !== 'unknown').map((cell) => `${AXIS_LABELS[cell.axis][lang]}: ${en ? cell.summaryEn : cell.summary}`);
  const missing = dedupe([...cells.flatMap((cell) => cell.missing), ...scenario.missingData].map((id) => humanizeMissing(id, locale)));
  const validate = cells.filter((cell) => cell.level === 'unknown' || cell.level === 'worse').map((cell) => AXIS_LABELS[cell.axis][lang]);
  return { know: know.slice(0, MAX_CARD_ITEMS), missing: missing.slice(0, MAX_CARD_ITEMS + 2), validate };
}

export function buildScenarioCards(data: AnalysisResult, locale: CardLocale): ScenarioCard[] {
  const en = locale === 'en';
  const base = data.strategies.find((strategy) => strategy.id === 'A');
  return data.strategies.map((strategy) => {
    const summary = strategy.tradeoffs?.summary;
    return {
      id: strategy.id,
      baseline: strategy.baseline,
      sequence: [...(strategy.slots ?? [])].sort((a, b) => a.slotIndex - b.slotIndex).map((slot) => ({ slotIndex: slot.slotIndex, year: slot.year, season: slot.season, cropId: slot.cropId, cropName: slot.cropName })),
      benefits: (en ? summary?.gainsEn : summary?.gains)?.slice(0, MAX_CARD_ITEMS) ?? [],
      risks: (en ? summary?.lossesEn : summary?.losses)?.slice(0, MAX_CARD_ITEMS) ?? [],
      gaps: (en ? summary?.unknownsEn : summary?.unknowns)?.slice(0, MAX_CARD_ITEMS) ?? [],
      alignment: strategy.priorityAlignment ?? [],
      delta: buildCardDelta(base, strategy),
      honesty: buildCardHonesty(strategy, locale),
    };
  });
}
