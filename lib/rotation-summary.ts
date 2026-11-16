import { cropById } from '@/lib/catalog';
import { slotSeasonWindow } from '@/lib/engine/slot-season';
import { slotWindow, windowWaterBalance } from '@/lib/engine/slot-window';
import type { AnalysisResult, Rotation } from '@/lib/engine/types';
import type { Locale } from '@/lib/i18n';
import { scenarioDisplayTitle } from '@/lib/presentation';

export const HORIZON_MONTHS = 24;
const MONTHS: Record<Locale, string[]> = {
  'pt-BR': ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

export type RotationBlock = { slotIndex: number; cropId: string; cropName: string; startOffset: number; months: number; startMonth: number; endMonth: number };
export type RotationOutcome =
  | { kind: 'reference' }
  | { kind: 'delta'; /** Why waterDeltaMm is null: A has no second crop to compare, or this lane has no water value. Null when the delta exists. */ missingReason: 'base_missing' | 'no_data' | null; /** B or C minus A, P-ET0 accumulated over the second crop window (slot 2), in mm. Null when unknown. */ waterDeltaMm: number | null; tag: { kind: 'no_zarc'; cropName: string } | { kind: 'gain'; text: string } | null };
export type RotationLane = {
  id: 'A' | 'B' | 'C'; title: string; blocks: RotationBlock[];
  /** Contiguous runs of bare-soil months, by offset in the 24-month horizon. Empty when unknown or none. */
  bareRuns: Array<{ startOffset: number; months: number }>;
  /** False when the engine could not assemble the occupancy calendar (bare-soil state unknown). */
  bareKnown: boolean; outcome: RotationOutcome; description: string;
};
export type RotationSummary = { startMonth: number; monthLabels: string[]; lanes: RotationLane[] };

function runs(offsets: number[]): Array<{ startOffset: number; months: number }> {
  const result: Array<{ startOffset: number; months: number }> = [];
  for (const offset of [...offsets].sort((a, b) => a - b)) {
    const last = result.at(-1);
    if (last && last.startOffset + last.months === offset) last.months += 1; else result.push({ startOffset: offset, months: 1 });
  }
  return result;
}

type Placement = { slot: Rotation['slots'][number]; crop: ReturnType<typeof cropById.get>; window: NonNullable<ReturnType<typeof slotWindow>>; assumedStart: boolean };

/**
 * Crop windows of a strategy. A safrinha (season B) slot whose start month the history never revealed has no
 * engine window; for this summary view only, it is laid out right after the same year's season A window ends
 * (flagged `assumedStart`) so the sequence is not collapsed to a single crop.
 */
function placements(analysis: AnalysisResult, strategy: Rotation): Placement[] {
  const result: Placement[] = [];
  for (const slot of strategy.slots) {
    if (!slot.cropId) continue;
    const crop = cropById.get(slot.cropId as never);
    let first = slotSeasonWindow(analysis.input, slot.season).month; let assumedStart = false;
    if (first === null && slot.season === 'B') {
      const main = result.find((item) => item.slot.year === slot.year && item.slot.season === 'A');
      if (main) { first = (main.window.months.at(-1)! % 12) + 1; assumedStart = true; }
    }
    const window = slotWindow(crop, first, slot.season);
    if (window) result.push({ slot, crop, window, assumedStart });
  }
  return result;
}

/** Second-crop window P-ET0 sum (mm): the slot indicator the engine computed, else the same FAO-56 P-ET0 helper over the placed window. */
export function secondCropWaterMm(strategy: Rotation | undefined, analysis?: AnalysisResult): number | null {
  const value = strategy?.slots.find((slot) => slot.slotIndex === 1)?.indicators.find((indicator) => indicator.id === 'window_water_balance')?.value;
  if (typeof value === 'number') return value;
  if (!strategy || !analysis) return null;
  const placed = placements(analysis, strategy).find((item) => item.slot.slotIndex === 1);
  return placed ? windowWaterBalance(placed.window, analysis.climate?.waterBalanceByMonth).sumMm : null;
}

function blocks(analysis: AnalysisResult, strategy: Rotation, locale: Locale): RotationBlock[] {
  const start = analysis.input.plantingMonth;
  return placements(analysis, strategy).flatMap(({ slot, crop, window }) => {
    const startOffset = ((window.startMonth - start + 12) % 12) + (slot.year === 2 ? 12 : 0);
    const length = Math.min(window.months.length, HORIZON_MONTHS - startOffset);
    if (length <= 0) return [];
    return [{ slotIndex: slot.slotIndex, cropId: slot.cropId!, cropName: crop ? crop.commonNames[locale] : slot.cropName ?? slot.cropId!, startOffset, months: length, startMonth: window.startMonth, endMonth: window.months[length - 1]! }];
  });
}

/** Shapes the existing engine result into the 24-month simple rotation view. Pure; unknown values stay null. */
export function buildRotationSummary(analysis: AnalysisResult, locale: Locale): RotationSummary {
  const start = analysis.input.plantingMonth; const names = MONTHS[locale];
  const baseWater = secondCropWaterMm(analysis.strategies.find((item) => item.id === 'A'), analysis);
  const lanes = (['A', 'B', 'C'] as const).flatMap((id): RotationLane[] => {
    const strategy = analysis.strategies.find((item) => item.id === id);
    if (!strategy) return [];
    const laneBlocks = blocks(analysis, strategy, locale);
    const bareKnown = Boolean(strategy.bareSoil && strategy.bareSoil.windowsSource !== 'unknown');
    const bareRuns = bareKnown && strategy.bareSoil ? runs(strategy.bareSoil.bareMonths.map((item) => item.offset)) : [];
    let outcome: RotationOutcome = { kind: 'reference' };
    if (id !== 'A') {
      const water = secondCropWaterMm(strategy, analysis);
      const second = strategy.slots.find((slot) => slot.slotIndex === 1);
      const secondCrop = second?.cropId ? cropById.get(second.cropId as never) : undefined;
      const gains = strategy.tradeoffs ? (locale === 'en' ? strategy.tradeoffs.summary.gainsEn : strategy.tradeoffs.summary.gains) : [];
      const tag: Extract<RotationOutcome, { kind: 'delta' }>['tag'] = second?.zarc?.status === 'not_indicated' ? { kind: 'no_zarc', cropName: secondCrop?.commonNames[locale] ?? second.cropName ?? second.cropId ?? '' } : gains[0] ? { kind: 'gain', text: gains[0] } : null;
      const hasDelta = water !== null && baseWater !== null;
      const baseHasSecond = Boolean(analysis.strategies.find((item) => item.id === 'A')?.slots.some((item) => item.slotIndex === 1 && item.cropId));
      outcome = { kind: 'delta', waterDeltaMm: hasDelta ? water - baseWater : null, missingReason: hasDelta ? null : !baseHasSecond ? 'base_missing' : 'no_data', tag };
    }
    const spans = laneBlocks.map((block) => `${block.cropName} ${names[block.startMonth - 1]}–${names[block.endMonth - 1]}`).join(', ');
    return [{ id, title: scenarioDisplayTitle(strategy, locale), blocks: laneBlocks, bareRuns, bareKnown, outcome, description: spans }];
  });
  return { startMonth: start, monthLabels: Array.from({ length: HORIZON_MONTHS }, (_, index) => names[(start - 1 + index) % 12]!), lanes };
}
