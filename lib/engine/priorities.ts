import { cropById, type Crop } from '@/lib/catalog';
import type { AnalysisInput } from '@/lib/schema';
import { MONTH_ABBR } from '@/lib/engine/slot-season';
import type { ZarcWindowStatus } from '@/lib/brazil/zarc';
import type { Explanation, PriorityAlignment, PriorityKey, Rotation } from '@/lib/engine/types';

/**
 * Priority-aware, deterministic selection rules (catalog order is the final tie-break).
 * Every rule uses only catalog attributes that are non-null; when the needed attribute is null the
 * rule is reported as "not applied" and the default rule is used. Qualitative only: no score is produced.
 *
 * A priority is "dominant" when its weight is strictly the highest. When all weights are equal nothing is dominant.
 */
type Priorities = AnalysisInput['priorities'];
const KEYS: PriorityKey[] = ['water', 'soil', 'operations'];

export function dominantPriorities(priorities: Priorities): Set<PriorityKey> {
  const max = Math.max(...KEYS.map((key) => priorities[key]));
  const dominant = KEYS.filter((key) => priorities[key] === max);
  return max > 0 && dominant.length < KEYS.length ? new Set(dominant) : new Set();
}

/** Highest documented Kc stage; used only as a documented proxy for water exposure, never to compute ETc. */
export function peakKcOf(crop: Crop | undefined): { kc: number; stage: string } | null {
  const stages = crop?.kcStages; if (!stages?.length) return null;
  const peak = stages.reduce((best, stage) => stage.kc > best.kc ? stage : best, stages[0]);
  return { kc: peak.kc, stage: peak.stage };
}
export function cycleMaxOf(crop: Crop | undefined): number | null { return crop?.cycleDaysRange?.max ?? null; }

export type SelectionRule = 'default' | 'soil_n_fixation' | 'soil_residue' | 'soil_unapplied' | 'water_kc' | 'water_cycle' | 'water_unapplied' | 'ops_cycle' | 'ops_unapplied';
/** ZARC status of a candidate in the safrinha month; `not_indicated` candidates are only used when no other candidate exists. */
export type ZarcFilter = (crop: Crop) => 'indicated' | 'not_indicated' | 'unknown';
export type Selection = { crop: Crop | undefined; rule: SelectionRule };

const num = (value: number) => String(value);

const byLowest = (pool: Crop[], value: (crop: Crop) => number | null): Crop | undefined => pool.reduce<Crop | undefined>((best, crop) => { const v = value(crop); if (v === null) return best; const b = best ? value(best) : null; return b === null || v < b ? crop : best; }, undefined);
/** Soil rule: documented N fixation first, then documented residue; within each tier a different family wins, and a documented attribute beats an undocumented different-family crop. */
function soilPick(pool: Crop[], last: Crop | undefined): Selection | undefined {
  /** Functional diversity first: candidates of the same family as the safra crop only count after every different-family candidate. */
  const tiers = [pool.filter((crop) => !last || crop.family !== last.family), pool.filter((crop) => last && crop.family === last.family)];
  for (const tier of tiers) {
    const nCrop = tier.find((crop) => crop.nitrogenFixationPotential); if (nCrop) return { crop: nCrop, rule: 'soil_n_fixation' };
    const rCrop = tier.find((crop) => crop.residuePotential); if (rCrop) return { crop: rCrop, rule: 'soil_residue' };
  }
  return undefined;
}
function waterPick(pool: Crop[]): Selection | undefined {
  const kc = byLowest(pool, (crop) => peakKcOf(crop)?.kc ?? null); if (kc) return { crop: kc, rule: 'water_kc' };
  const cycle = byLowest(pool, cycleMaxOf); return cycle ? { crop: cycle, rule: 'water_cycle' } : undefined;
}

/** B (cover alternative to the current safrinha). Soil dominant -> soilPick; else water dominant -> lowest documented kc/cycle; else default (different family first). Crops in `excluded` (current pattern) are never offered. */
export function pickCover(selectable: Crop[], last: Crop | undefined, dominant: Set<PriorityKey>, excludedCropIds: string[] = [], zarc?: ZarcFilter): Selection {
  return zarcTiers(selectable, zarc, (pool) => pickCoverIn(pool, last, dominant, excludedCropIds));
}
/** Tries candidates not marked `not_indicated` first, then the rest. */
function zarcTiers(pool: Crop[], zarc: ZarcFilter | undefined, pick: (pool: Crop[]) => Selection): Selection {
  if (!zarc) return pick(pool);
  const first = pick(pool.filter((crop) => zarc(crop) !== 'not_indicated')); return first.crop ? first : pick(pool);
}
function pickCoverIn(selectable: Crop[], last: Crop | undefined, dominant: Set<PriorityKey>, excludedCropIds: string[]): Selection {
  const covers = selectable.filter((crop) => crop.purposes.includes('cover') && !excludedCropIds.includes(crop.id));
  const different = covers.filter((crop) => !last || crop.family !== last.family);
  const fallback = (different.length ? different : covers)[0];
  if (dominant.has('soil')) return soilPick(covers, last) ?? { crop: fallback, rule: fallback ? 'soil_unapplied' : 'default' };
  if (dominant.has('water')) return waterPick(different.length ? different : covers) ?? { crop: fallback, rule: fallback ? 'water_unapplied' : 'default' };
  return { crop: fallback, rule: 'default' };
}

/** C. Water dominant -> lowest documented peak kc, else shortest cycle; else soil dominant -> documented N fixation/residue (different from B); else operations dominant -> shortest cycle (proxy), else commercial crop. */
export function pickThird(selectable: Crop[], last: Crop | undefined, excludedCropIds: string[], dominant: Set<PriorityKey>, zarc?: ZarcFilter): Selection {
  return zarcTiers(selectable, zarc, (pool) => pickThirdIn(pool, last, excludedCropIds, dominant));
}
function pickThirdIn(selectable: Crop[], last: Crop | undefined, excludedCropIds: string[], dominant: Set<PriorityKey>): Selection {
  const candidates = selectable.filter((crop) => !excludedCropIds.includes(crop.id) && (crop.commercial || crop.purposes.includes('cover')) && crop.viableTempC);
  const different = candidates.filter((crop) => !last || crop.family !== last.family);
  const pool = different.length ? different : candidates;
  if (dominant.has('water')) return waterPick(pool) ?? { crop: pool[0], rule: pool[0] ? 'water_unapplied' : 'default' };
  if (dominant.has('soil')) return soilPick(candidates, last) ?? { crop: pool[0], rule: pool[0] ? 'soil_unapplied' : 'default' };
  if (dominant.has('operations')) {
    const byCycle = byLowest(pool, cycleMaxOf); if (byCycle) return { crop: byCycle, rule: 'ops_cycle' };
    return { crop: pool.find((crop) => crop.commercial) ?? pool[0], rule: pool[0] ? 'ops_unapplied' : 'default' };
  }
  return { crop: pool[0], rule: 'default' };
}

export function selectionTitle(id: 'B' | 'C', rule: SelectionRule): string {
  if (id === 'B') return 'Saúde do solo';
  return rule === 'water_kc' || rule === 'water_cycle' ? 'Menor exposição hídrica documentada' : rule === 'ops_cycle' ? 'Ciclo mais curto documentado' : 'Diversificação';
}

/** `safra` is the safra crop of the pattern; when the pick has a different family the note says so. */
export function selectionNote(selection: Selection, safra?: Crop, zarc?: ZarcWindowStatus | null): Explanation | undefined {
  const { crop, rule } = selection; if (!crop || rule === 'default') return undefined;
  const applied = rule === 'soil_n_fixation' || rule === 'soil_residue' || rule === 'water_kc' || rule === 'water_cycle' || rule === 'ops_cycle';
  const kc = peakKcOf(crop); const cycle = crop.cycleDaysRange;
  const messages: Record<Exclude<SelectionRule, 'default'>, string> = {
    soil_n_fixation: `Prioridade “solo” dominante: entre as candidatas, foi escolhida uma com fixação de N documentada (${crop.nitrogenFixationPotential}). Critério qualitativo; não estima kg de N.`,
    soil_residue: `Prioridade “solo” dominante: nenhuma candidata de família diferente tem fixação de N documentada; foi escolhida uma com potencial de palha documentado (${crop.residuePotential}). Critério qualitativo.`,
    soil_unapplied: 'Prioridade “solo” dominante, mas nenhuma candidata tem fixação de N ou potencial de palha documentados no catálogo; o critério não pôde ser aplicado e vale a regra padrão (família diferente).',
    water_kc: `Prioridade “água” dominante: foi escolhida a cultura com menor pico de Kc documentado (${kc ? `${num(kc.kc)} na fase “${kc.stage}”` : 'N/D'}), usado só como indicador de exposição hídrica; não calcula ETc, consumo nem irrigação.`,
    water_cycle: `Prioridade “água” dominante: sem Kc documentado nas candidatas, foi escolhida a de menor ciclo documentado (até ${cycle ? num(cycle.max) : 'N/D'} dias), usado só como indicador de menor tempo de exposição.`,
    water_unapplied: 'Prioridade “água” dominante, mas nenhuma candidata tem Kc ou ciclo documentado; o critério hídrico não pôde ser aplicado e vale a regra padrão (família diferente).',
    ops_cycle: `Prioridade “operação” dominante: foi escolhida a cultura de menor ciclo documentado (até ${cycle ? num(cycle.max) : 'N/D'} dias). É apenas um proxy de operação mais simples; não mede mão de obra, máquinas ou custo.`,
    ops_unapplied: 'Prioridade “operação” dominante, mas nenhuma candidata tem ciclo documentado; usado apenas o proxy “cultura comercial” quando disponível. Não mede mão de obra, máquinas ou custo.',
  };
  const zarcNote = !zarc ? '' : zarc.status === 'indicated' ? ` Cultura indicada no ZARC para ${MONTH_ABBR[zarc.month - 1]} (risco ${zarc.riskLevelPct}%).` : zarc.status === 'unknown' ? ' Sem registro ZARC para esta cultura neste mês; não foi penalizada, mas o calendário permanece desconhecido.' : ' Atenção: o ZARC não indica este mês para a cultura (nenhuma alternativa indicada foi encontrada).';
  const familyNote = safra && crop.family !== safra.family ? ` Família diferente da cultura da safra (${safra.commonNames['pt-BR']}).` : '';
  return { kind: 'limitation', message: messages[rule] + familyNote + zarcNote, ruleId: applied ? 'PRIORITY_RULE_APPLIED' : 'PRIORITY_CRITERION_NOT_APPLIED', sourceRefs: crop.sourceRefs, certainty: applied ? 'medium' : 'high', missingData: applied ? [] : ['documented_priority_attribute'] };
}

type Level = PriorityAlignment['level'];
const t = (priority: PriorityKey, level: Level, reason: string, reasonEn: string): PriorityAlignment => ({ priority, level, reason, reasonEn });
/** Rank of a value among the documented values of the set; null when a comparison is impossible (fewer than two documented). */
function compare(value: number | null, all: Array<number | null>, ): { level: Level; position: 'menor' | 'maior' | 'intermediário' | 'igual' } | null {
  const known = all.filter((item): item is number => item !== null); if (value === null || known.length < 2) return null;
  const min = Math.min(...known); const max = Math.max(...known);
  if (min === max) return { level: 'neutral', position: 'igual' };
  return value === min ? { level: 'supports', position: 'menor' } : value === max ? { level: 'conflicts', position: 'maior' } : { level: 'neutral', position: 'intermediário' };
}
const posEn = { menor: 'lowest', maior: 'highest', intermediário: 'intermediate', igual: 'equal' } as const;

function waterAlignment(crop: Crop | undefined, all: Array<Crop | undefined>): PriorityAlignment {
  if (!crop) return t('water', 'unknown', 'Sem cultura proposta para comparar a exposição hídrica.', 'No proposed crop to compare water exposure.');
  const kc = peakKcOf(crop); const byKc = compare(kc?.kc ?? null, all.map((item) => peakKcOf(item)?.kc ?? null));
  if (byKc && kc) return t('water', byKc.level, `Pico de Kc documentado ${num(kc.kc)} (${byKc.position} entre os cenários com Kc documentado). Indicador de exposição hídrica, não calcula consumo.`, `Documented peak Kc ${num(kc.kc)} (${posEn[byKc.position]} among scenarios with documented Kc). Water-exposure indicator; does not compute water use.`);
  const byCycle = compare(cycleMaxOf(crop), all.map(cycleMaxOf));
  if (byCycle) return t('water', byCycle.level, `Ciclo documentado de até ${num(cycleMaxOf(crop)!)} dias (${byCycle.position} entre os cenários com ciclo documentado).`, `Documented cycle of up to ${num(cycleMaxOf(crop)!)} days (${posEn[byCycle.position]} among scenarios with documented cycle).`);
  return t('water', 'unknown', `Sem Kc ou ciclo documentado comparável para ${crop.commonNames['pt-BR']}.`, `No comparable documented Kc or cycle for ${crop.commonNames.en}.`);
}
function soilAlignment(crop: Crop | undefined, last: Crop | undefined): PriorityAlignment {
  if (!crop) return t('soil', 'unknown', 'Sem cultura proposta para avaliar a saúde do solo.', 'No proposed crop to assess soil health.');
  const name = crop.commonNames['pt-BR']; const en = crop.commonNames.en; const repeats = Boolean(last && crop.family === last.family); const cover = crop.purposes.includes('cover');
  if (crop.nitrogenFixationPotential) return t('soil', 'supports', `${name}: fixação de N documentada (${crop.nitrogenFixationPotential}). Qualitativo; não estima kg de N.`, `${en}: documented N fixation (${crop.nitrogenFixationPotential}). Qualitative; no kg of N estimated.`);
  if (cover && !repeats) return t('soil', 'supports', `${name}: finalidade de cobertura catalogada e família diferente da cultura anterior.`, `${en}: cataloged cover purpose and a different family from the previous crop.`);
  if (cover) return t('soil', 'neutral', `${name}: tem cobertura catalogada, mas repete a família da cultura anterior.`, `${en}: has a cataloged cover purpose but repeats the previous crop family.`);
  if (repeats) return t('soil', 'conflicts', `${name}: sem cobertura catalogada e repete a família da cultura anterior.`, `${en}: no cataloged cover and repeats the previous crop family.`);
  if (!last) return t('soil', 'unknown', `${name}: sem cobertura catalogada e sem cultura anterior para comparar a família.`, `${en}: no cataloged cover and no previous crop to compare the family.`);
  return t('soil', 'neutral', `${name}: sem cobertura catalogada, mas muda a família da cultura anterior.`, `${en}: no cataloged cover, but changes the previous crop family.`);
}
function operationsAlignment(crop: Crop | undefined, all: Array<Crop | undefined>): PriorityAlignment {
  if (!crop) return t('operations', 'unknown', 'Sem cultura proposta; operação não avaliável (proxy).', 'No proposed crop; operations cannot be assessed (proxy).');
  const name = crop.commonNames['pt-BR']; const en = crop.commonNames.en; const byCycle = compare(cycleMaxOf(crop), all.map(cycleMaxOf));
  if (byCycle) return t('operations', byCycle.level, `Proxy de operação: ciclo documentado de até ${num(cycleMaxOf(crop)!)} dias (${byCycle.position} entre os cenários). Não mede mão de obra, máquinas ou custo.`, `Operations proxy: documented cycle of up to ${num(cycleMaxOf(crop)!)} days (${posEn[byCycle.position]} among scenarios). Does not measure labor, machinery or cost.`);
  return crop.commercial
    ? t('operations', 'neutral', `Proxy de operação: ${name} é cultura comercial catalogada; ciclo não documentado para comparar.`, `Operations proxy: ${en} is a cataloged commercial crop; no documented cycle to compare.`)
    : t('operations', 'conflicts', `Proxy de operação: ${name} não tem finalidade comercial catalogada; ciclo não documentado.`, `Operations proxy: ${en} has no cataloged commercial purpose; cycle not documented.`);
}

/**
 * Attaches a qualitative priority alignment to each scenario. Order, ids and crops are never changed
 * (A stays first, B/C keep their positions); this is the only "ranking" the engine performs.
 */
export function alignPriorities(candidates: Rotation[], priorities: Priorities, lastCropId?: string): Rotation[] {
  /** The distinguishing crop of a scenario is its safrinha slot (slot 2) when configured, otherwise its proposed crop. */
  const crops = candidates.map((item) => { const id = item.slots.find((slot) => slot.slotIndex === 1)?.cropId ?? item.proposedCrop?.cropId; return id ? cropById.get(id as Crop['id']) : undefined; });
  const last = lastCropId ? cropById.get(lastCropId as Crop['id']) : undefined;
  return candidates.map((item, index) => ({ ...item, priorityAlignment: KEYS.filter((key) => priorities[key] > 0).map((key) => key === 'water' ? waterAlignment(crops[index], crops) : key === 'soil' ? soilAlignment(crops[index], last) : operationsAlignment(crops[index], crops)) }));
}
