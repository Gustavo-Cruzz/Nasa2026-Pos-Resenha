import type { NasaInsight } from '@/lib/engine/types';
import type { WaterBalanceMonth } from '@/lib/climate/indicators';
import { cropDisplayName } from '@/lib/presentation';

type Locale = 'pt-BR' | 'en';
type ScenarioId = 'A' | 'B' | 'C';
export type CalendarState = 'compatible' | 'attention' | 'unknown';
export type CalendarCell = { month: number; state: CalendarState; valueC: number | null; rangeC: { min: number; max: number } | null; /** Distance (°C) to the nearest edge of the documented range; negative when outside. */ marginC: number | null };
export type CalendarRow = { scenarioId: ScenarioId; cropId: string | null; cropName: string | null; cells: CalendarCell[] };
export type ScenarioMonth = { scenarioId: ScenarioId; cropId: string | null; cropName: string | null; valueC: number; rangeC: { min: number; max: number }; marginC: number; state: 'compatible' | 'attention' };
export type SeasonInsight =
  | { kind: 'thermal_contrast'; month: number; valueC: number; attention: ScenarioMonth[]; compatible: ScenarioMonth[] }
  | { kind: 'thermal_margin'; month: number; valueC: number; tightest: ScenarioMonth; roomiest: ScenarioMonth }
  | { kind: 'water_deficit'; months: number[]; worstMonth: number; worstBalanceMm: number; plantingMonthBalanceMm: number | null }
  | { kind: 'no_reading'; reason: 'climate' | 'range' };

const round = (value: number) => Number(value.toFixed(2));
const MIN_BALANCE_COVERAGE = 80;

/**
 * 12-month thermal calendar per hypothesis from the NASA monthly median temperature and each crop's documented range.
 * `deltaC` applies a hypothetical offset ("what if"); 0 is the historical reading. Months without a thermal reading or range are unknown, never compatible.
 */
export function deriveRotationCalendar(insights: NasaInsight[], deltaC = 0): CalendarRow[] {
  const first = insights.find((insight) => insight.effects.length > 0);
  if (!first) return [];
  return first.effects.map((base) => ({
    scenarioId: base.scenarioId,
    cropId: base.cropId,
    cropName: base.cropName,
    cells: Array.from({ length: 12 }, (_, index) => {
      const month = index + 1;
      const insight = insights.find((item) => item.month === month);
      const effect = insight?.effects.find((item) => item.scenarioId === base.scenarioId);
      const range = effect?.documentedRangeC ?? null;
      if (!insight || insight.metric !== 'temperature' || insight.observedValue === null || !range) return { month, state: 'unknown' as const, valueC: insight?.metric === 'temperature' ? insight.observedValue : null, rangeC: range, marginC: null };
      const valueC = round(insight.observedValue + deltaC);
      const marginC = round(Math.min(valueC - range.min, range.max - valueC));
      return { month, state: marginC >= 0 ? 'compatible' as const : 'attention' as const, valueC, rangeC: range, marginC };
    }),
  }));
}

/** Adds a hypothetical rainfall change; ET0 is NOT recomputed. Missing precipitation stays null. */
export function applyRainChange(balance: WaterBalanceMonth[], rainPct: number): WaterBalanceMonth[] {
  if (rainPct === 0) return balance;
  return balance.map((month) => {
    if (month.precipMedianMm === null || month.et0MedianMm === null) return month;
    const precip = round(month.precipMedianMm * (1 + rainPct / 100));
    return { ...month, precipMedianMm: precip, balanceMedianMm: round(precip - month.et0MedianMm) };
  });
}

const circularDistance = (a: number, b: number) => { const d = Math.abs(a - b); return Math.min(d, 12 - d); };
const monthRef = (row: CalendarRow, cell: CalendarCell): ScenarioMonth | undefined => cell.valueC !== null && cell.rangeC && cell.marginC !== null && cell.state !== 'unknown' ? { scenarioId: row.scenarioId, cropId: row.cropId, cropName: row.cropName, valueC: cell.valueC, rangeC: cell.rangeC, marginC: cell.marginC, state: cell.state } : undefined;

export function deriveSeasonInsights(calendar: CalendarRow[], balance: WaterBalanceMonth[], plantingMonth: number): SeasonInsight[] {
  const insights: SeasonInsight[] = [];
  const readable = (month: number) => calendar.flatMap((row) => { const ref = monthRef(row, row.cells[month - 1]); return ref ? [ref] : []; });
  const months = Array.from({ length: 12 }, (_, index) => index + 1).sort((a, b) => circularDistance(a, plantingMonth) - circularDistance(b, plantingMonth) || a - b);
  const contrastMonth = months.find((month) => { const refs = readable(month); return refs.some((ref) => ref.state === 'attention') && refs.some((ref) => ref.state === 'compatible'); });
  if (contrastMonth) {
    const refs = readable(contrastMonth);
    insights.push({ kind: 'thermal_contrast', month: contrastMonth, valueC: refs[0].valueC, attention: refs.filter((ref) => ref.state === 'attention'), compatible: refs.filter((ref) => ref.state === 'compatible') });
  } else {
    const refs = readable(plantingMonth);
    if (refs.length >= 2) {
      const sorted = [...refs].sort((a, b) => a.marginC - b.marginC);
      insights.push({ kind: 'thermal_margin', month: plantingMonth, valueC: refs[0].valueC, tightest: sorted[0], roomiest: sorted[sorted.length - 1] });
    }
  }
  const deficit = balance.filter((month) => month.balanceMedianMm !== null && month.coveragePct >= MIN_BALANCE_COVERAGE && month.balanceMedianMm < 0);
  if (deficit.length > 0) {
    const worst = deficit.reduce((acc, month) => (month.balanceMedianMm as number) < (acc.balanceMedianMm as number) ? month : acc);
    const planting = balance.find((month) => month.month === plantingMonth);
    insights.push({ kind: 'water_deficit', months: deficit.map((month) => month.month), worstMonth: worst.month, worstBalanceMm: worst.balanceMedianMm as number, plantingMonthBalanceMm: planting && planting.balanceMedianMm !== null && planting.coveragePct >= MIN_BALANCE_COVERAGE ? planting.balanceMedianMm : null });
  }
  if (!insights.some((insight) => insight.kind === 'thermal_contrast' || insight.kind === 'thermal_margin')) {
    const anyRange = calendar.some((row) => row.cells.some((cell) => cell.rangeC));
    const anyValue = calendar.some((row) => row.cells.some((cell) => cell.valueC !== null));
    insights.push({ kind: 'no_reading', reason: anyValue ? 'range' : 'climate' });
  }
  return insights;
}

const monthNames = { 'pt-BR': ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'], en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] } as const;
export const monthLabel = (month: number, locale: Locale) => monthNames[locale][month - 1];

export function formatMonths(months: number[], locale: Locale): string {
  const sorted = [...new Set(months)].sort((a, b) => a - b);
  const groups: number[][] = [];
  for (const month of sorted) { const last = groups.at(-1); if (last && month === last[last.length - 1] + 1) last.push(month); else groups.push([month]); }
  return groups.map((group) => group.length === 1 ? monthLabel(group[0], locale) : `${monthLabel(group[0], locale)}–${monthLabel(group[group.length - 1], locale)}`).join(', ');
}

const num = (value: number, locale: Locale) => value.toLocaleString(locale === 'en' ? 'en-US' : 'pt-BR', { maximumFractionDigits: 1 });
const label = (ref: ScenarioMonth, locale: Locale) => `${cropDisplayName(ref.cropId, ref.cropName, locale) || 'N/D'} (${locale === 'en' ? 'scenario' : 'cenário'} ${ref.scenarioId})`;
const range = (ref: ScenarioMonth) => `${ref.rangeC.min}–${ref.rangeC.max} °C`;

export const seasonCaveat = (locale: Locale) => locale === 'en'
  ? 'Historical NASA POWER readings compared with documented ranges and a climate water balance (precipitation minus FAO-56 ET0). Exploration only: not a forecast, recommendation, irrigation need or crop water use.'
  : 'Leituras históricas NASA POWER comparadas com faixas documentadas e um balanço hídrico climático (chuva menos ET0 FAO-56). Apenas exploração: não é previsão, recomendação, necessidade de irrigação nem consumo da cultura.';

/** Plain-language insight with the NASA value, the documented range and the rule always visible. */
export function describeSeasonInsight(insight: SeasonInsight, locale: Locale): { title: string; detail: string } {
  const en = locale === 'en';
  switch (insight.kind) {
    case 'thermal_contrast': {
      const month = monthLabel(insight.month, locale);
      const attention = insight.attention.map((ref) => `${label(ref, locale)} ${en ? 'outside' : 'fora de'} ${range(ref)}`).join('; ');
      const compatible = insight.compatible.map((ref) => `${label(ref, locale)} ${en ? 'inside' : 'dentro de'} ${range(ref)}`).join('; ');
      return { title: en ? `${month}: the hypotheses diverge on temperature` : `${month}: as hipóteses divergem na temperatura`, detail: `${en ? 'NASA POWER median' : 'Mediana NASA POWER'} ${num(insight.valueC, locale)} °C — ${attention}. ${compatible}.` };
    }
    case 'thermal_margin': {
      const month = monthLabel(insight.month, locale);
      return { title: en ? `${month}: ${label(insight.tightest, locale)} has the smallest thermal margin` : `${month}: ${label(insight.tightest, locale)} tem a menor margem térmica`, detail: en ? `NASA POWER median ${num(insight.valueC, locale)} °C. Margin to the nearest edge of the documented range: ${num(insight.tightest.marginC, locale)} °C for ${label(insight.tightest, locale)} (${range(insight.tightest)}) vs. ${num(insight.roomiest.marginC, locale)} °C for ${label(insight.roomiest, locale)} (${range(insight.roomiest)}).` : `Mediana NASA POWER ${num(insight.valueC, locale)} °C. Margem até o limite mais próximo da faixa documentada: ${num(insight.tightest.marginC, locale)} °C para ${label(insight.tightest, locale)} (${range(insight.tightest)}) contra ${num(insight.roomiest.marginC, locale)} °C para ${label(insight.roomiest, locale)} (${range(insight.roomiest)}).` };
    }
    case 'water_deficit': {
      const worst = `${monthLabel(insight.worstMonth, locale)} (${num(insight.worstBalanceMm, locale)} mm)`;
      const planting = insight.plantingMonthBalanceMm === null ? '' : en ? ` In the planting month the median balance is ${num(insight.plantingMonthBalanceMm, locale)} mm.` : ` No mês de plantio o balanço mediano é ${num(insight.plantingMonthBalanceMm, locale)} mm.`;
      return { title: en ? `Climate water deficit in ${formatMonths(insight.months, locale)}` : `Déficit hídrico climático em ${formatMonths(insight.months, locale)}`, detail: en ? `Median precipitation is below FAO-56 ET0; largest gap in ${worst}.${planting}` : `A chuva mediana fica abaixo da ET0 FAO-56; maior diferença em ${worst}.${planting}` };
    }
    case 'no_reading':
      return insight.reason === 'climate'
        ? { title: en ? 'No NASA reading to compare' : 'Sem leitura NASA para comparar', detail: en ? 'Historical climate is unavailable for this point; nothing is treated as fine (N/D).' : 'O clima histórico está indisponível neste ponto; nada é tratado como ok (N/D).' }
        : { title: en ? 'No documented thermal range to compare' : 'Sem faixa térmica documentada para comparar', detail: en ? 'The hypotheses have no documented thermal range; temperature alone does not become a decision (N/D).' : 'As hipóteses não têm faixa térmica documentada; só a temperatura não vira decisão (N/D).' };
  }
}
