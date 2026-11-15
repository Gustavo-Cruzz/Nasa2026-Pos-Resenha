import { cropById, type Crop } from '@/lib/catalog';
import type { AnalysisInput } from '@/lib/schema';
import type { LabSlotAssessment } from '@/lib/lab/assessment';
import type { IndicatorState, QualitativeIndicator, SoilHealthIndicator } from '@/lib/engine/types';
import { detectCurrentPattern } from '@/lib/lab/sequence';
import { MONTH_ABBR, slotSeasonWindow } from '@/lib/engine/slot-season';

/**
 * Scenario-level view of a 4-slot sequence. Keeps the existing indicator ids/states; every row is a
 * deterministic, qualitative aggregate over the slots (worst state, any/all, named crops). No scores.
 */
const stateText: Record<IndicatorState, string> = { compatible: 'compatível', attention: 'atenção', unknown: 'desconhecido', yes: 'presente', no: 'não catalogado', observed: 'observação' };
const getCrop = (id: string | null | undefined): Crop | undefined => id ? cropById.get(id as Crop['id']) : undefined;
const name = (crop: Crop) => crop.commonNames['pt-BR'];
const unique = <T,>(items: T[]): T[] => [...new Set(items)];

type Row = { slot: LabSlotAssessment; crop: Crop; label: string; key: string };
function rowsOf(input: AnalysisInput, slots: LabSlotAssessment[]): Row[] {
  const seen = new Set<string>();
  return slots.flatMap((slot) => { const crop = getCrop(slot.cropId); if (!crop) return []; const key = `${crop.id}:${slot.season}`; if (seen.has(key)) return []; seen.add(key); const month = slotSeasonWindow(input, slot.season).month; return [{ slot, crop, key, label: `${name(crop)} (${month === null ? 'mês não informado' : MONTH_ABBR[month - 1]})` }]; });
}
/** Consecutive crop pairs, starting from the last historical crop, labelled "a→b"; `same` pairs share a botanical family. */
function pairs(input: AnalysisInput, slots: LabSlotAssessment[]): { same: string[]; all: string[] } {
  const first = getCrop(slots[0]?.cropId); const lastHistory = getCrop(input.history.at(-1)?.cropId);
  /** When the last historical crop is the detected current safra and slot 1 is that same crop, the sequence continues it; this is not a repetition. */
  const continues = Boolean(lastHistory && first && lastHistory.id === first.id && detectCurrentPattern(input.history, input.futureBaseline)[0] === lastHistory.id);
  const sequence = [continues ? undefined : lastHistory, ...slots.map((slot) => getCrop(slot.cropId))];
  const all: string[] = []; const same: string[] = [];
  for (let index = 1; index < sequence.length; index += 1) {
    const a = sequence[index - 1]; const b = sequence[index]; if (!a || !b) continue;
    const label = a.id === b.id ? `${name(b)} após ${name(a)}` : `${name(a)}→${name(b)}`; all.push(label);
    if (a.family === b.family) same.push(a.id === b.id ? `${name(b)} após ${name(a)} (mesma família ${a.family})` : `${name(a)}→${name(b)}: mesma família ${a.family}`);
  }
  return { all: unique(all), same: unique(same) };
}
const worst = (states: IndicatorState[]): IndicatorState => !states.length ? 'unknown' : states.includes('attention') ? 'attention' : states.includes('unknown') ? 'unknown' : 'compatible';

export function aggregateIndicators(input: AnalysisInput, slots: LabSlotAssessment[], base: QualitativeIndicator[]): QualitativeIndicator[] {
  const rows = rowsOf(input, slots); if (!rows.length) return base;
  const pick = (row: Row, id: QualitativeIndicator['id']) => row.slot.indicators.find((item) => item.id === id);
  const refs = (id: QualitativeIndicator['id']) => unique(rows.flatMap((row) => pick(row, id)?.sourceRefs ?? []));
  const pr = pairs(input, slots); const covers = rows.filter((row) => row.crop.purposes.includes('cover')); const species = unique([...slots.map((slot) => slot.cropId), ...input.history.map((event) => event.cropId)].filter(Boolean));
  const aggregated = (id: QualitativeIndicator['id']): Partial<QualitativeIndicator> => {
    if (id === 'thermal_compatibility') { const states = rows.map((row) => pick(row, id)?.state ?? 'unknown'); return { state: worst(states), detail: `Pior estado entre as safras (comparação exploratória com a climatologia NASA do mês de cada safra): ${rows.map((row, index) => `${row.label} ${stateText[states[index]!]}`).join('; ')}.`, sourceRefs: refs(id) }; }
    if (['historical_precipitation', 'rainfall_distribution', 'root_zone_wetness', 'window_water_balance', 'documented_water_response'].includes(id)) { const items = rows.map((row) => ({ row, item: pick(row, id) })); return { state: items.some((entry) => entry.item?.state === 'observed') ? 'observed' : 'unknown', detail: items.map((entry) => `${entry.row.label}: ${entry.item?.detail ?? 'N/D'}`).join(' | '), sourceRefs: refs(id) }; }
    if (id === 'frost_risk') { const states = rows.map((row) => pick(row, id)?.state ?? 'unknown'); return { state: states.includes('attention') ? 'attention' : states.includes('unknown') ? 'unknown' : 'observed', detail: rows.map((row) => `${row.label}: ${pick(row, id)?.detail ?? 'N/D'}`).join(' | '), sourceRefs: refs(id) }; }
    if (id === 'cover_potential') return covers.length ? { state: 'yes', detail: `Cobertura catalogada na sequência: ${unique(covers.map((row) => name(row.crop))).join(', ')}; não estima carbono, N ou fertilidade.`, sourceRefs: unique(covers.flatMap((row) => row.crop.sourceRefs)) } : { state: 'no', detail: `Nenhuma cultura da sequência (${unique(rows.map((row) => name(row.crop))).join(', ')}) tem finalidade de cobertura catalogada.` };
    if (id === 'functional_diversity') return !pr.all.length ? { state: 'unknown', detail: 'Família da cultura anterior ou proposta desconhecida.' } : pr.same.length ? { state: 'attention', detail: `Repetição de família na sequência: ${pr.same.join('; ')}. ${species.length} espécie(s) no histórico + sequência.` } : { state: 'compatible', detail: `Famílias diferentes entre culturas consecutivas (${pr.all.join('; ')}). ${species.length} espécie(s) no histórico + sequência.` };
    if (id === 'soil_context') { const items = rows.map((row) => pick(row, id)).filter((item): item is QualitativeIndicator => Boolean(item)); const state = worst(items.map((item) => item.state)); const chosen = items.find((item) => item.state === state) ?? items[0]; return chosen ? { state, detail: chosen.detail, origin: chosen.origin, value: chosen.value } : {}; }
    return {};
  };
  return base.map((item) => ({ ...item, ...aggregated(item.id) }));
}

export function aggregateSoilHealth(input: AnalysisInput, slots: LabSlotAssessment[], base: SoilHealthIndicator[], historyCrops: Crop[]): SoilHealthIndicator[] {
  const rows = rowsOf(input, slots); if (!rows.length) return base;
  const pr = pairs(input, slots); const covers = rows.filter((row) => row.crop.purposes.includes('cover')); const crops = unique([...historyCrops, ...rows.map((row) => row.crop)].map((crop) => crop.id)).map((id) => getCrop(id)!);
  const fixers = rows.filter((row) => row.crop.nitrogenFixationPotential);
  const override = (item: SoilHealthIndicator): SoilHealthIndicator => {
    if (item.id === 'species_diversity') return { ...item, state: 'observed', value: crops.length, detail: `${crops.length} espécie(s) catalogada(s) no histórico + sequência de 2 anos (${crops.map(name).join(', ')}); não é previsão de desempenho.`, sourceRefs: unique(crops.flatMap((crop) => crop.sourceRefs)), missingData: [] };
    if (item.id === 'family_repetition') return !pr.all.length ? { ...item, state: 'unknown' } : pr.same.length ? { ...item, state: 'attention', detail: `Repetição de família: ${pr.same.join('; ')}.`, missingData: [] } : { ...item, state: 'yes', detail: `Sem repetição de família entre culturas consecutivas (${pr.all.join('; ')}).`, missingData: [] };
    if (item.id === 'cover_presence') return covers.length ? { ...item, state: 'yes', detail: `Cobertura catalogada na sequência: ${unique(covers.map((row) => name(row.crop))).join(', ')}. Não quantifica biomassa, carbono ou proteção efetiva.`, missingData: [] } : { ...item, state: 'no', detail: `Nenhuma cultura da sequência (${unique(rows.map((row) => name(row.crop))).join(', ')}) tem finalidade de cobertura catalogada.`, missingData: [] };
    if (item.id === 'nitrogen_fixation_potential') return fixers.length ? { ...item, state: 'yes', detail: `${unique(fixers.map((row) => `${name(row.crop)}: ${row.crop.nitrogenFixationPotential!.split(' — ')[0]}`)).join('; ')}. Potencial qualitativo; não estima kg de N.`, sourceRefs: unique(fixers.flatMap((row) => row.crop.sourceRefs)), missingData: [] } : { ...item, state: 'unknown', detail: 'Nenhuma cultura da sequência tem fixação de N documentada; a família botânica não é usada como substituto.' };
    if (item.id === 'erosion_protection_context' && covers.length) return { ...item, state: 'yes', detail: 'Cobertura catalogada na sequência pode ser discutida com chuva e relevo; não calcula perda de solo nem proteção efetiva.', missingData: ['management', 'field_cover'] };
    return item;
  };
  return base.map(override);
}
