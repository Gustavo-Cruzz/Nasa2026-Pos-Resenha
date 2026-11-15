import type { AnalysisInput } from '@/lib/schema';
import { cropById, isAnnualRotationEligible } from '@/lib/catalog';
import { permittedCatalogCrops } from '@/lib/farmer-profile';

/** Four slots in order Y1A, Y1B, Y2A, Y2B. */
export type LabSequence = { id: 'A' | 'B' | 'C'; title: string; cropIds: [string | null, string | null, string | null, string | null] };
export type EngineStrategyLike = { title?: string; proposedCrop?: { cropId?: string } | null };
type History = AnalysisInput['history'];
type Pattern = [string | null, string | null];

const monthIndex = (value: string) => { const [year, month] = value.split('-').map(Number); return (year ?? 0) * 12 + (month ?? 1); };
const SAFRINHA_GAP_MONTHS = 1;
const COVER_FALLBACKS = ['ruziziensis', 'pearl_millet', 'sunn_hemp'];
const LOW_WATER_FALLBACKS = ['sorghum', 'sunflower'];

/**
 * Detects the current Y1A/Y1B pattern from history. Two consecutive events with different crops whose gap is
 * at most one month are read as safra -> safrinha; otherwise a single crop is Y1A and Y1B stays unknown.
 * `weak` is true when nothing in the history or a confirmed baseline supports the pattern.
 */
export function detectCurrentPatternDetailed(history: History, futureBaseline?: AnalysisInput['futureBaseline']): { pattern: Pattern; weak: boolean } {
  const events = history.filter((event) => event.cropId).sort((a, b) => a.startYearMonth.localeCompare(b.startYearMonth));
  const last = events[events.length - 1];
  const previous = events[events.length - 2];
  const startMonth = (value: string) => Number(value.split('-')[1]);
  const isSafraStart = (value: string) => startMonth(value) >= 8 && startMonth(value) <= 12;
  let pattern: Pattern = [last?.cropId ?? null, null];
  let pair = false;
  let anchored = false;
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const safra = events[index]!;
    if (!isSafraStart(safra.startYearMonth)) continue;
    const next = events[index + 1];
    if (next && next.cropId !== safra.cropId && Math.abs(monthIndex(next.startYearMonth) - monthIndex(safra.endYearMonth)) <= SAFRINHA_GAP_MONTHS) { pattern = [safra.cropId ?? null, next.cropId ?? null]; pair = true; anchored = true; break; }
    if (!anchored) { pattern = [safra.cropId ?? null, null]; anchored = true; }
  }
  if (!anchored && last && previous && last.cropId !== previous.cropId && Math.abs(monthIndex(last.startYearMonth) - monthIndex(previous.endYearMonth)) <= SAFRINHA_GAP_MONTHS) { pattern = [previous.cropId ?? null, last.cropId ?? null]; pair = true; }
  const baseline = futureBaseline?.confirmed ? futureBaseline.cropId : undefined;
  if (baseline) {
    if (pattern[0] === baseline) return { pattern, weak: false };
    if (pair && pattern[1] === baseline) return { pattern: [baseline, pattern[0]], weak: false };
    return { pattern: [baseline, null], weak: false };
  }
  return { pattern, weak: !pair };
}
export function detectCurrentPattern(history: History, futureBaseline?: AnalysisInput['futureBaseline']): Pattern { return detectCurrentPatternDetailed(history, futureBaseline).pattern; }

/** Three 4-slot sequences. Crops outside the farmer's permitted list or non-annual are left null, never substituted. */
export function defaultLabSequences(input: AnalysisInput, engineCropIds: Array<string | undefined>, engineTitles: Array<string | undefined> = []): LabSequence[] {
  const allowed = new Set(permittedCatalogCrops(input.farmerCrops).map((crop) => crop.id as string));
  const ok = (cropId: string | null | undefined): string | null => cropId && cropById.has(cropId) && isAnnualRotationEligible(cropId) && allowed.has(cropId) ? cropId : null;
  const { pattern, weak } = detectCurrentPatternDetailed(input.history, input.futureBaseline);
  const a1 = ok(pattern[0]) ?? ok(engineCropIds[0]);
  const a2 = a1 === ok(pattern[0]) ? ok(pattern[1]) : null;
  const main = a1;
  const isCover = (cropId: string | null) => Boolean(cropId && cropById.get(cropId)?.purposes.includes('cover'));
  const engineB = ok(engineCropIds[1]);
  const cover = (isCover(engineB) && engineB !== main ? engineB : null) ?? COVER_FALLBACKS.map(ok).find(Boolean) ?? null;
  const engineC = ok(engineCropIds[2]);
  const lowWater = (engineC && engineC !== a2 && engineC !== main && engineC !== cover ? engineC : null) ?? LOW_WATER_FALLBACKS.map(ok).find((id) => id && id !== a2) ?? null;
  const twice = (first: string | null, second: string | null): LabSequence['cropIds'] => [first, second, first, second];
  return [
    { id: 'A', title: weak ? 'Continuidade presumida — confirmar' : 'Plano atual (detectado no histórico)', cropIds: twice(a1, a2) },
    { id: 'B', title: engineTitles[1] ?? 'Saúde do solo', cropIds: twice(main, cover) },
    { id: 'C', title: engineTitles[2] ?? 'Menor exposição hídrica documentada', cropIds: twice(main, lowWater) },
  ];
}
