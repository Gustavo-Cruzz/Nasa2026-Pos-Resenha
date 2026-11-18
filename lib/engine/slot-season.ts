import type { AnalysisInput } from '@/lib/schema';
import { detectCurrentPattern } from '@/lib/lab/sequence';
import type { SeasonWindow } from '@/lib/engine/indicators';

export const MONTH_ABBR = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'] as const;

/** Start month of the safrinha event observed in the farmer's history; null when no safra -> safrinha pair is detected. Never invented. */
export function safrinhaMonth(input: AnalysisInput): number | null {
  if (input.safrinhaPlantingMonth !== undefined) return input.safrinhaPlantingMonth;
  const pattern = detectCurrentPattern(input.history, input.futureBaseline); const cropId = pattern[1]; if (!cropId) return null;
  const events = input.history.filter((event) => event.cropId).sort((a, b) => a.startYearMonth.localeCompare(b.startYearMonth));
  const startMonth = (value: string) => Number(value.split('-')[1]);
  for (let index = events.length - 1; index >= 0; index -= 1) if (events[index]!.cropId === cropId && events[index - 1]?.cropId === pattern[0]) return startMonth(events[index]!.startYearMonth);
  for (let index = events.length - 1; index >= 0; index -= 1) if (events[index]!.cropId === cropId) return startMonth(events[index]!.startYearMonth);
  return null;
}

/** Season A (safra) uses the planting month; season B (safrinha) uses the observed safrinha start month or stays unknown. */
export function slotSeasonWindow(input: AnalysisInput, season: 'A' | 'B'): SeasonWindow {
  if (season === 'A') return { month: input.plantingMonth, label: 'safra' };
  const month = safrinhaMonth(input);
  return month === null ? { month: null, label: 'safrinha' } : { month, label: 'safrinha', note: `Safrinha avaliada em ${MONTH_ABBR[month - 1]} (${input.safrinhaPlantingMonth !== undefined ? 'mês informado pelo produtor' : 'início observado no seu histórico'}).` };
}
