import type { AnalysisResult } from '@/lib/engine/types';
import type { Locale } from '@/lib/i18n';
import { cropDisplayName, indicatorDisplay, missingLabel } from '@/lib/presentation';
import { ndviMunicipalCaveats } from '@/lib/climate/ndvi-copy';
import { erosivityLabel } from '@/lib/climate/erosivity';
import { dominantPriorities } from '@/lib/engine/priorities';
import { bareMonthCount, readMonth, secondCropSegment, windowBalanceSum, type ClimateSeries, type TimelineModel } from '@/lib/rotation-timeline/model';
import { isHypothetical, type WhatIf } from '@/lib/rotation-timeline/what-if';

export const MONTH_SHORT = { 'pt-BR': ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'], en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] } as const;
export const MONTH_LONG = { 'pt-BR': ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'], en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] } as const;

/** Locale number with a typographic minus; N/D for missing values (never a placeholder number). */
export function formatNumber(value: number | null | undefined, digits: number, locale: Locale, options: { sign?: boolean } = {}): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'N/D';
  const rounded = Number(value.toFixed(digits)); const zero = Object.is(rounded, -0) || rounded === 0 ? 0 : rounded;
  const text = Math.abs(zero).toLocaleString(locale === 'en' ? 'en-US' : 'pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  return `${zero < 0 ? '−' : options.sign && zero > 0 ? '+' : ''}${text}`;
}

/** Text equivalent of a 12-month series: "jan 96 mm; fev N/D; …" in calendar order starting at `startMonth`. */
export function seriesTextEquivalent(label: string, values: Array<number | null>, unit: string, startMonth: number, digits: number, locale: Locale): string {
  const parts = Array.from({ length: 12 }, (_, step) => { const month = ((startMonth - 1 + step) % 12); const value = values[month] ?? null; return `${MONTH_SHORT[locale][month]} ${value === null ? 'N/D' : `${formatNumber(value, digits, locale)}${unit ? ` ${unit}` : ''}`}`; });
  return `${label}: ${parts.join('; ')}.`;
}

export function placeLabel(data: AnalysisResult): string {
  const municipality = data.regionalContext.municipality;
  return municipality ? `${municipality.name} (${municipality.uf})` : `${data.input.location.latitude.toFixed(3)}, ${data.input.location.longitude.toFixed(3)}`;
}

/** One-line status of the screen, built only from the loaded analysis. */
export function buildStatusLine(data: AnalysisResult, model: TimelineModel, whatIf: WhatIf, locale: Locale): string {
  const en = locale === 'en';
  const place = placeLabel(data);
  const hypo = isHypothetical(whatIf) ? (en ? ' (with the hypothetical what-if applied)' : ' (com o “E se?” hipotético aplicado)') : '';
  if (data.climate.status !== 'available' || !model.series.has.balance) return en ? `${place}: ${model.lanes.length} scenarios over 24 months. Historical P−ET₀ is N/D for this location, so the water bands stay empty; crop windows and bare soil are still shown.` : `${place}: ${model.lanes.length} cenários em 24 meses. O P−ET₀ histórico está N/D neste local, então as faixas de água ficam vazias; janelas de cultura e solo descoberto continuam visíveis.`;
  const sums = model.lanes.map((lane) => { const segment = secondCropSegment(lane, 1); const sum = segment ? windowBalanceSum(model.series, segment.months, whatIf).sumMm : null; return `${lane.id} ${sum === null ? 'N/D' : `${formatNumber(sum, 0, locale)} mm`}`; });
  const bare = model.lanes.map((lane) => { const count = bareMonthCount(lane); return `${lane.id} ${count === null ? 'N/D' : count}`; });
  return en ? `${place}: P−ET₀ over the second-crop window${hypo}: ${sums.join(' · ')}. Months with no crop window: ${bare.join(' · ')}. Climate context for a conversation, not a recommendation.` : `${place}: P−ET₀ na janela da segunda cultura${hypo}: ${sums.join(' · ')}. Meses sem janela de cultura: ${bare.join(' · ')}. Contexto climático para conversa, não recomendação.`;
}

/** "Você cultivou: soja (2023-10 → 2024-02), …" */
export function historyLine(data: AnalysisResult, locale: Locale): string {
  return data.input.history.map((event) => `${cropDisplayName(event.cropId, event.otherLabel, locale)} (${event.startYearMonth} → ${event.endYearMonth})`).join(', ');
}
const priorityLabel = { 'pt-BR': { water: 'umidade e água', soil: 'solo e cobertura', operations: 'operação e calendário' }, en: { water: 'moisture and water', soil: 'soil and cover', operations: 'operations and calendar' } } as const;
export function prioritiesLine(data: AnalysisResult, locale: Locale): string[] {
  const dominant = dominantPriorities(data.input.priorities);
  return (['water', 'soil', 'operations'] as const).filter((key) => dominant.has(key)).map((key) => priorityLabel[locale][key]);
}
export function systemsLine(data: AnalysisResult, locale: Locale): string[] {
  const types = { 'pt-BR': { single: 'cultivo solteiro', intercrop: 'consórcio', succession: 'sucessão', rotation: 'rotação' }, en: { single: 'single crop', intercrop: 'intercrop', succession: 'succession', rotation: 'rotation' } } as const;
  return (data.input.croppingSystems ?? []).map((system) => `${system.plotId}: ${types[locale][system.type]} (${[...new Set(system.events.map((event) => event.cropId))].map((id) => cropDisplayName(id, undefined, locale)).join(' + ')})`);
}

export type TechnicianBrief = { known: string[]; missing: string[]; risks: string[]; questions: string[] };
/** What we know / what is missing / risks / questions for the technician, derived only from the analysis. */
export function buildTechnicianBrief(data: AnalysisResult, locale: Locale): TechnicianBrief {
  const en = locale === 'en';
  const known: string[] = []; const missing: string[] = []; const risks: string[] = []; const questions: string[] = [];
  const provenance = data.climate.provenance;
  if (data.climate.status === 'available' && provenance) known.push(en ? `NASA POWER historical climate ${provenance.period.start.slice(0, 4)}–${provenance.period.end.slice(0, 4)} (monthly medians) is loaded.` : `Clima histórico NASA POWER ${provenance.period.start.slice(0, 4)}–${provenance.period.end.slice(0, 4)} (medianas mensais) carregado.`);
  else missing.push(en ? 'historical climate' : 'clima histórico');
  if (data.regionalContext.municipality && data.regionalContext.zarc) known.push(en ? `Municipal ZARC (${data.regionalContext.zarc.safra}) for ${data.regionalContext.municipality.name}.` : `ZARC municipal (${data.regionalContext.zarc.safra}) de ${data.regionalContext.municipality.name}.`);
  else missing.push(en ? 'municipal ZARC' : 'ZARC municipal');
  if (data.soilContext?.staticProfile.status === 'available') known.push(en ? 'Regional soil estimate (SoilGrids, 0–30 cm) loaded; it is not a field analysis.' : 'Estimativa regional de solo (SoilGrids, 0–30 cm) carregada; não é análise do talhão.');
  if (data.terrain?.status === 'available') known.push(en ? 'Relief from NASA SRTM loaded.' : 'Relevo do SRTM da NASA carregado.');
  if (data.climate.erosivity?.classId) known.push(en ? `Rainfall erosivity: ${erosivityLabel(data.climate.erosivity.classId, 'en')}.` : `Erosividade da chuva: ${erosivityLabel(data.climate.erosivity.classId, 'pt-BR')}.`);
  for (const id of [...new Set(data.strategies.flatMap((strategy) => [...strategy.missingData, ...(strategy.bareSoil?.missing ?? [])]))]) missing.push(missingLabel(id, locale));
  if (!data.climate.ndvi) missing.push(en ? 'MODIS NDVI series' : 'série NDVI MODIS');
  else if (data.climate.ndvi.origin === 'municipal_artifact') known.push(ndviMunicipalCaveats(locale).join(' '));
  for (const strategy of data.strategies) {
    const bare = strategy.bareSoil;
    if (bare && bare.bareMonthsInHighErosivity.length) risks.push(en ? `${strategy.id}: ${bare.bareMonthsInHighErosivity.length} bare month(s) fall in months of above-average erosive rain.` : `${strategy.id}: ${bare.bareMonthsInHighErosivity.length} mês(es) descoberto(s) em meses de chuva mais erosiva.`);
    for (const indicator of strategy.indicators.filter((item) => item.state === 'attention')) risks.push(`${strategy.id}: ${indicatorDisplay(indicator, locale).label}.`);
  }
  for (const warning of data.warnings) risks.push(warning);
  const usesRegionalSoil = data.input.soil?.origin !== 'farmer_lab';
  if (usesRegionalSoil) questions.push(en ? 'Does a local soil analysis (pH, texture, organic carbon) confirm the regional estimate?' : 'Uma análise de solo do talhão (pH, textura, carbono orgânico) confirma a estimativa regional?');
  if (data.regionalContext.zarc) questions.push(en ? 'Does the ZARC window apply to your soil type and cycle group?' : 'A janela do ZARC vale para o seu tipo de solo e grupo de ciclo?');
  const bareMonths = data.strategies.some((strategy) => (strategy.bareSoil?.bareMonths.length ?? 0) > 0);
  if (bareMonths) questions.push(en ? 'What cover or residue will protect the soil in the months with no crop window?' : 'Que cobertura ou palhada protegerá o solo nos meses sem janela de cultura?');
  questions.push(en ? 'Which of these hypotheses is workable with your machinery, labour and market?' : 'Qual destas hipóteses é viável com suas máquinas, mão de obra e mercado?');
  return { known, missing: [...new Set(missing)], risks: [...new Set(risks)], questions };
}

/** Rows used by the month panel: label key + value text, so it can be unit-tested without React. */
export function monthPanelRows(series: ClimateSeries, month: number, whatIf: WhatIf, locale: Locale) {
  const reading = readMonth(series, month, whatIf);
  const mm = (value: number | null, digits = 0, sign = false) => value === null ? 'N/D' : `${formatNumber(value, digits, locale, { sign })} mm`;
  return { reading, rain: mm(reading.rainMm, 1), et0: mm(reading.et0Mm), balance: mm(reading.balanceMm, 0, true), temp: reading.tmeanC === null ? 'N/D' : `${formatNumber(reading.tmeanC, 1, locale)} °C`, wetness: formatNumber(reading.wetness, 2, locale), ndvi: formatNumber(reading.ndvi, 2, locale), share: reading.rainSharePct === null ? 'N/D' : `${formatNumber(reading.rainSharePct, 1, locale)} %`, frost: reading.frost ? `${reading.frost.years}/${reading.frost.valid}` : 'N/D' };
}
