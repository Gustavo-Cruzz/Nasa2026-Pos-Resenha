import type { Crop } from '@/lib/catalog';
import type { ClimateContext } from '@/lib/climate/nasa-power';
import type { HistoricalWaterContextMonth, WaterBalanceMonth } from '@/lib/climate/indicators';
import { MONTH_ABBR } from '@/lib/engine/slot-season';

/** Declared assumption (not a catalog value): window length in months when the crop has no documented cycle. */
export const ASSUMED_WINDOW_MONTHS = { A: 4, B: 4 } as const;
const DAYS_PER_MONTH = 30;
export type SlotWindow = { startMonth: number; months: number[]; source: 'documented_cycle' | 'assumed_default'; /** Documented maximum cycle used, null when assumed. */ cycleDays: number | null };

/**
 * Months a slot occupies from its start month. With a documented `cycleDaysRange` the window is
 * ceil(max cycle / 30) months (the longest documented cycle, so the window covers the whole range; capped at 12).
 * Otherwise a fixed assumed length per season applies and the source says so. Null when the start month is unknown.
 */
export function slotWindow(crop: Crop | undefined, startMonth: number | null, season: 'A' | 'B' = 'A'): SlotWindow | null {
  if (startMonth === null || startMonth < 1 || startMonth > 12) return null;
  const cycleDays = crop?.cycleDaysRange?.max ?? null;
  const length = cycleDays !== null ? Math.min(12, Math.max(1, Math.ceil(cycleDays / DAYS_PER_MONTH))) : ASSUMED_WINDOW_MONTHS[season];
  return { startMonth, months: Array.from({ length }, (_, index) => (startMonth - 1 + index) % 12 + 1), source: cycleDays !== null ? 'documented_cycle' : 'assumed_default', cycleDays };
}

const num = (value: number, digits = 1) => String(Number(value.toFixed(digits))).replace('.', ',');
const names = (months: number[]) => months.map((month) => MONTH_ABBR[month - 1]).join(', ');
export function windowLabel(window: SlotWindow): string {
  const span = `${MONTH_ABBR[window.months[0]! - 1]}–${MONTH_ABBR[window.months.at(-1)! - 1]}`;
  return window.source === 'documented_cycle' ? `janela de ${window.months.length} meses (${span}; ciclo documentado de até ${window.cycleDays} dias)` : `janela presumida de ${window.months.length} meses (${span}; ciclo não documentado, duração presumida)`;
}

export type WindowThermal = { state: 'compatible' | 'attention' | 'unknown'; outOfRangeMonths: number[]; missingMonths: number[]; observed: Array<{ month: number; tmeanC: number | null }> };
/** Median Tmean of every window month against the crop's documented viable range. Any month out of range is attention. */
export function windowThermal(window: SlotWindow, crop: Crop | undefined, climate: ClimateContext): WindowThermal {
  const observed = window.months.map((month) => ({ month, tmeanC: climate.monthly.find((item) => item.month === month)?.tmeanMedianC ?? null }));
  const range = crop?.viableTempC;
  if (!range || climate.status !== 'available') return { state: 'unknown', outOfRangeMonths: [], missingMonths: [], observed };
  const outOfRangeMonths = observed.filter((item) => item.tmeanC !== null && (item.tmeanC < range.min || item.tmeanC > range.max)).map((item) => item.month);
  const missingMonths = observed.filter((item) => item.tmeanC === null).map((item) => item.month);
  return { state: outOfRangeMonths.length ? 'attention' : missingMonths.length ? 'unknown' : 'compatible', outOfRangeMonths, missingMonths, observed };
}
export function windowThermalDetail(window: SlotWindow, crop: Crop | undefined, result: WindowThermal): string {
  const head = `Comparação exploratória com a climatologia mensal NASA em ${windowLabel(window)}.`;
  if (result.state === 'unknown' && !crop?.viableTempC) return 'Faixa térmica documentada e/ou clima histórico indisponível.';
  const values = result.observed.map((item) => `${MONTH_ABBR[item.month - 1]} ${item.tmeanC === null ? 'N/D' : `${num(item.tmeanC)} °C`}`).join('; ');
  const range = crop?.viableTempC ? `faixa documentada ${crop.viableTempC.min}–${crop.viableTempC.max} °C` : '';
  const tail = result.state === 'attention' ? `Fora da faixa em: ${names(result.outOfRangeMonths)}.` : result.state === 'unknown' ? `Sem leitura em: ${names(result.missingMonths)}.` : 'Todos os meses da janela dentro da faixa.';
  return `${head} Tmédia mediana: ${values}; ${range}. ${tail}`;
}

export type WindowWaterBalance = { sumMm: number | null; months: Array<{ month: number; balanceMm: number | null }>; missingMonths: number[] };
/** Sum of monthly medians of P - ET0 over the window: climate context, not crop demand, ETc or irrigation need. Any missing month makes the sum null. */
export function windowWaterBalance(window: SlotWindow, balances: WaterBalanceMonth[] | undefined): WindowWaterBalance {
  const months = window.months.map((month) => ({ month, balanceMm: balances?.find((item) => item.month === month)?.balanceMedianMm ?? null }));
  const missingMonths = months.filter((item) => item.balanceMm === null).map((item) => item.month);
  return { sumMm: missingMonths.length || !balances ? null : Number(months.reduce((sum, item) => sum + (item.balanceMm as number), 0).toFixed(1)), months, missingMonths };
}
export function windowWaterBalanceDetail(window: SlotWindow, result: WindowWaterBalance): string {
  const perMonth = result.months.map((item) => `${MONTH_ABBR[item.month - 1]} ${item.balanceMm === null ? 'N/D' : `${num(item.balanceMm, 0)} mm`}`).join('; ');
  if (result.sumMm === null) return `Balanço P−ET0 indisponível em ${windowLabel(window)}${result.missingMonths.length ? ` (sem dados em: ${names(result.missingMonths)})` : ''}.`;
  return `${num(result.sumMm, 0)} mm de P−ET0 acumulado em ${windowLabel(window)} (soma das medianas mensais: ${perMonth}). Contexto climático (precipitação − ET0 FAO-56); não é demanda da cultura, ETc nem necessidade de irrigação.`;
}

export type WindowWater = { months: HistoricalWaterContextMonth[]; rainDays: Array<{ month: number; days: number | null }>; rootZone: Array<{ month: number; value: number | null }> };
/** IMERG rain days and root-zone wetness of each window month, from the series already loaded. */
export function windowWater(window: SlotWindow, byMonth: HistoricalWaterContextMonth[] | undefined): WindowWater {
  const months = window.months.flatMap((month) => { const item = byMonth?.find((entry) => entry.month === month); return item ? [item] : []; });
  return { months, rainDays: window.months.map((month) => ({ month, days: byMonth?.find((item) => item.month === month)?.medianRainDays ?? null })), rootZone: window.months.map((month) => ({ month, value: byMonth?.find((item) => item.month === month)?.rootZoneWetnessMedian ?? null })) };
}
export const rainDaysDetail = (window: SlotWindow, water: WindowWater) => `Dias com chuva IMERG (mediana) em ${windowLabel(window)}: ${water.rainDays.map((item) => `${MONTH_ABBR[item.month - 1]} ${item.days === null ? 'N/D' : num(item.days, 0)}`).join('; ')}. Não indica suficiência para a cultura.`;
export const rootZoneDetail = (window: SlotWindow, water: WindowWater) => `Umidade da zona radicular (índice relativo 0–1, mediana) em ${windowLabel(window)}: ${water.rootZone.map((item) => `${MONTH_ABBR[item.month - 1]} ${item.value === null ? 'N/D' : num(item.value, 2)}`).join('; ')}. Grade regional modelada, não medição do talhão.`;

export type WindowFrost = { state: 'attention' | 'observed' | 'unknown'; frostMonths: Array<{ month: number; frostYears: number; validYears: number; medianDays: number | null }>; known: boolean };
/** Frost screen over the window months: attention when any month has a share of years with Tmin <= 2 C above zero. */
export function windowFrost(window: SlotWindow, climate: ClimateContext): WindowFrost {
  const rows = window.months.map((month) => climate.frostByMonth?.find((item) => item.month === month));
  const known = rows.length > 0 && rows.every((row) => row && row.validYears > 0);
  const frostMonths = rows.flatMap((row) => row && row.frostYears > 0 ? [{ month: row.month, frostYears: row.frostYears, validYears: row.validYears, medianDays: row.medianFrostDays }] : []);
  return { state: frostMonths.length ? 'attention' : known ? 'observed' : 'unknown', frostMonths, known };
}
export function windowFrostDetail(window: SlotWindow, result: WindowFrost, thresholdC = 2): string {
  const note = `Limiar de triagem de ${thresholdC} °C (temperatura do ar, NASA POWER T2M_MIN); limiares de dano específicos de cada cultura não são modelados.`;
  if (result.state === 'unknown') return `Dados de Tmín indisponíveis para a ${windowLabel(window)}. ${note}`;
  if (result.state === 'observed') return `Risco de geada: 0 anos com Tmín ≤ ${thresholdC} °C em ${windowLabel(window)}. ${note}`;
  return `Risco de geada: ${result.frostMonths.map((item) => `${item.frostYears} de ${item.validYears} anos com Tmín ≤ ${thresholdC} °C em ${MONTH_ABBR[item.month - 1]} (mediana ${item.medianDays === null ? 'N/D' : num(item.medianDays, 0)} dia(s))`).join('; ')}. ${note}`;
}
