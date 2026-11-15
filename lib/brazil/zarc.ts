import type { BrazilRegionalContext, ZarcRiskLevel, ZarcWindow } from '@/lib/brazil/types';

/**
 * ZARC (MAPA Tábua de Risco) planting-window interpretation — pure functions, no I/O.
 *
 * Usage (engine/UI):
 *   const status = zarcWindowStatus(regionalContext, 'soybean', 10);            // October, any soil / any cycle group
 *   const status = zarcWindowStatus(regionalContext, 'maize', 2, 'clayey', 21);  // Feb, texture supplied by the farmer, Grupo II
 *   const year = zarcYearCalendar(regionalContext, 'sorghum');                   // 12 entries for a planting calendar
 *   const months = zarcSafraMonths(regionalContext, 'soybean');                  // months (1-12) with at least one indicated decêndio
 *
 * Semantics (all sourced, see docs/SOURCES.md "ZARC"):
 * - A decêndio with a CSV value 20/30/40 is an indicated sowing period at that risk level; 0 = not indicated.
 * - Month m covers decêndios 3(m-1)+1 .. 3(m-1)+3 (dec1-3 = Jan ... dec34-36 = Dec).
 * - Without a supplied soil texture/cycle group, every soil/cycle table is considered: `riskLevelPct` is the BEST (lowest) level
 *   across them and `riskLevelWorstPct` the worst level among the indicated ones; `allConsideredIndicated` tells whether every
 *   considered table indicates the month (otherwise indication depends on soil/cycle).
 * - Texture maps only to MAPA soil Tipo 1/2/3 (Cod_Solo 1/2/3). Safra 2026/27 tables for many municipalities use only AD1–AD6
 *   (Cod_Solo 11–16), which cannot be derived from texture here: a supplied texture with no matching table yields `unknown`.
 * - Only "Sequeiro" (rainfed) tables are used; the ZARC does not restrict irrigated crops. Tables without a management label are kept.
 */

export type ZarcSoilTexture = 'sandy' | 'medium' | 'clayey';
export type ZarcSourceRef = { label: string; url: string; locator: string; quote: string };
export type ZarcWindowStatus = {
  status: 'indicated' | 'not_indicated' | 'unknown';
  month: number;
  cropId: string;
  /** Best (lowest) risk level among indicated decêndios of the month and considered tables. */
  riskLevelPct: ZarcRiskLevel | null;
  riskLevelWorstPct: ZarcRiskLevel | null;
  /** Decêndios (1-36) of the month. */
  decendios: number[];
  /** Subset of `decendios` indicated by at least one considered table. */
  indicatedDecendios: number[];
  /** True when every considered table indicates at least one decêndio of the month. */
  allConsideredIndicated: boolean;
  soilScope: 'any' | 'texture';
  /** Cod_Solo values of the considered tables. */
  soilCodes: number[];
  /** Cod_Ciclo values of the considered tables (cycle groups). */
  cycleCodes: number[];
  zarcCultures: string[];
  note: string;
  noteEn: string;
  sourceRefs: ZarcSourceRef[];
};

export const ZARC_SOURCE_REFS: ZarcSourceRef[] = [
  {
    label: 'MAPA — Manual de Instruções do novo Painel do Zarc',
    url: 'https://www.gov.br/agricultura/pt-br/assuntos/riscos-seguro/programa-nacional-de-zoneamento-agricola-de-risco-climatico/documentos/ManualdeInstruesdonovoPaineldoZarc.pdf',
    locator: 'p. 4, "Mapa" / "Tábua de Risco"',
    quote: 'o risco de 20% é representado pela cor verde, 30% amarelo e 40% vermelho.',
  },
  {
    label: 'Portaria SPA/MAPA nº 386/2025 (ZARC milho 2ª safra, GO) — Anexo',
    url: 'https://www.gov.br/agricultura/pt-br/assuntos/riscos-seguro/programa-nacional-de-zoneamento-agricola-de-risco-climatico/portarias/2025-2026/goias-go/copy_of_PORTN33.PDF',
    locator: 'Anexo, item 3.1 e 3.3 (tabela de períodos decendiais)',
    quote: 'O Zarc indica os períodos de plantio em períodos decendiais (dez dias).',
  },
  {
    label: 'MAPA — Dicionário de dados da Tábua de Risco',
    url: 'https://dados.agricultura.gov.br/dataset/6d3d141c-885e-41a4-ab7f-dc8ff323b96f/resource/bebb0ebb-bc75-460c-b900-a7a1ebd87bee/download/dicionario-de-dados-tabua-de-risco-2026.pdf',
    locator: 'DETALHAMENTO, colunas Cod_Ciclo, Cod_Solo, dec1 a dec 36',
    quote: 'dec1 a dec 36 — Período de plantio no ano separado por decêndios de 1 a 36',
  },
];

/** Decêndios (1-36) of a calendar month (1-12). */
export function zarcDecendiosOfMonth(month: number): number[] {
  if (!Number.isInteger(month) || month < 1 || month > 12) return [];
  const first = (month - 1) * 3 + 1;
  return [first, first + 1, first + 2];
}

const textureSoilCode: Record<ZarcSoilTexture, number> = { sandy: 1, medium: 2, clayey: 3 };
const monthNamesPt = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const monthNamesEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const sortedUnique = (values: number[]) => [...new Set(values)].sort((a, b) => a - b);

function unknown(cropId: string, month: number, soilScope: 'any' | 'texture', note: string, noteEn: string, extra: Partial<ZarcWindowStatus> = {}): ZarcWindowStatus {
  return { status: 'unknown', month, cropId, riskLevelPct: null, riskLevelWorstPct: null, decendios: zarcDecendiosOfMonth(month), indicatedDecendios: [], allConsideredIndicated: false, soilScope, soilCodes: [], cycleCodes: [], zarcCultures: [], note, noteEn, sourceRefs: ZARC_SOURCE_REFS, ...extra };
}

export function zarcWindowStatus(
  regionalContext: BrazilRegionalContext | null | undefined,
  cropId: string,
  month: number,
  soilTexture?: ZarcSoilTexture | null,
  cycleCode?: number | null,
): ZarcWindowStatus {
  const soilScope = soilTexture ? 'texture' : 'any';
  const decendios = zarcDecendiosOfMonth(month);
  if (!decendios.length) return unknown(cropId, month, soilScope, 'Mês inválido.', 'Invalid month.');
  const crop = regionalContext?.zarc?.crops[cropId];
  if (!regionalContext?.zarc || !crop) return unknown(cropId, month, soilScope, 'Sem registro ZARC desta safra para a cultura neste município.', 'No ZARC record of this safra for the crop in this municipality.');
  const windows = crop.windows ?? [];
  if (!windows.length) return unknown(cropId, month, soilScope, 'O índice ZARC não traz tabelas por decêndio para esta cultura.', 'The ZARC index has no per-decêndio tables for this crop.');

  let considered: ZarcWindow[] = windows.filter((window) => window.management === null || window.management === 'Sequeiro');
  if (!considered.length) return unknown(cropId, month, soilScope, 'Só há tabelas ZARC irrigadas para esta cultura; o ZARC de sequeiro não se aplica.', 'Only irrigated ZARC tables exist for this crop; no rainfed ZARC applies.');
  if (soilTexture) {
    const code = textureSoilCode[soilTexture];
    considered = considered.filter((window) => window.soilCodes.includes(code));
    if (!considered.length) return unknown(cropId, month, soilScope, 'A textura informada não tem tabela ZARC (Tipo 1/2/3) neste município; a safra usa classes AD (1–6) que não são derivadas da textura.', 'The supplied texture has no ZARC table (Tipo 1/2/3) here; the safra uses AD classes (1–6) that are not derived from texture.');
  }
  if (cycleCode !== null && cycleCode !== undefined) {
    considered = considered.filter((window) => window.cycleCodes.includes(cycleCode));
    if (!considered.length) return unknown(cropId, month, soilScope, `O grupo de ciclo ${cycleCode} não tem tabela ZARC para esta cultura neste município.`, `Cycle group ${cycleCode} has no ZARC table for this crop in this municipality.`);
  }

  const levels: ZarcRiskLevel[] = [];
  const indicated = new Set<number>();
  const cultures = new Set<string>();
  let indicatingTables = 0;
  for (const window of considered) {
    let tableIndicates = false;
    for (const decendio of decendios) {
      const level = window.risk[decendio - 1];
      if (level) { levels.push(level); indicated.add(decendio); tableIndicates = true; }
    }
    if (tableIndicates) { indicatingTables += 1; cultures.add(window.culture); }
  }
  const soilCodes = sortedUnique(considered.flatMap((window) => window.soilCodes));
  const cycleCodes = sortedUnique(considered.flatMap((window) => window.cycleCodes));
  const scope = soilTexture ? `solo Tipo ${textureSoilCode[soilTexture]}` : 'qualquer solo';
  const scopeEn = soilTexture ? `soil Tipo ${textureSoilCode[soilTexture]}` : 'any soil';
  const base = { month, cropId, decendios, soilScope: soilScope as 'any' | 'texture', soilCodes, cycleCodes, sourceRefs: ZARC_SOURCE_REFS };
  if (!levels.length) {
    return { ...base, status: 'not_indicated', riskLevelPct: null, riskLevelWorstPct: null, indicatedDecendios: [], allConsideredIndicated: false, zarcCultures: [], note: `ZARC 2026/27: nenhum decêndio de ${monthNamesPt[month - 1]} é indicado para plantio (${scope}).`, noteEn: `ZARC 2026/27: no decêndio of ${monthNamesEn[month - 1]} is indicated for sowing (${scopeEn}).` };
  }
  const best = Math.min(...levels) as ZarcRiskLevel;
  const worst = Math.max(...levels) as ZarcRiskLevel;
  const all = indicatingTables === considered.length;
  const indicatedDecendios = [...indicated].sort((a, b) => a - b);
  return {
    ...base,
    status: 'indicated',
    riskLevelPct: best,
    riskLevelWorstPct: worst,
    indicatedDecendios,
    allConsideredIndicated: all,
    zarcCultures: [...cultures].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    note: `ZARC 2026/27: ${monthNamesPt[month - 1]} tem ${indicatedDecendios.length} de ${decendios.length} decêndios indicados, risco ${best}%${worst !== best ? ` a ${worst}%` : ''} (${scope})${all ? '' : '; a indicação depende de solo/grupo de ciclo'}.`,
    noteEn: `ZARC 2026/27: ${monthNamesEn[month - 1]} has ${indicatedDecendios.length} of ${decendios.length} decêndios indicated, risk ${best}%${worst !== best ? ` to ${worst}%` : ''} (${scopeEn})${all ? '' : '; indication depends on soil/cycle group'}.`,
  };
}

/** Twelve month statuses (Jan..Dec) for a planting calendar. */
export function zarcYearCalendar(regionalContext: BrazilRegionalContext | null | undefined, cropId: string, soilTexture?: ZarcSoilTexture | null, cycleCode?: number | null): ZarcWindowStatus[] {
  return Array.from({ length: 12 }, (_, index) => zarcWindowStatus(regionalContext, cropId, index + 1, soilTexture, cycleCode));
}

/** Months (1-12) with at least one indicated decêndio — useful to anchor the safra. Empty when unknown. */
export function zarcSafraMonths(regionalContext: BrazilRegionalContext | null | undefined, cropId: string, soilTexture?: ZarcSoilTexture | null, cycleCode?: number | null): number[] {
  return zarcYearCalendar(regionalContext, cropId, soilTexture, cycleCode).filter((entry) => entry.status === 'indicated').map((entry) => entry.month);
}
