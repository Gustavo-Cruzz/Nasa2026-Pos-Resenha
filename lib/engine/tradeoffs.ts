import { cropById, verifiedCropEvidence, type Crop } from '@/lib/catalog';
import type { ClimateContext } from '@/lib/climate/nasa-power';
import type { BrazilRegionalContext } from '@/lib/brazil/types';
import type { LabSlotAssessment } from '@/lib/lab/assessment';
import { dominantPriorities, peakKcOf } from '@/lib/engine/priorities';
import { MONTH_ABBR } from '@/lib/engine/slot-season';
import type { PriorityKey, Rotation } from '@/lib/engine/types';
import type { AnalysisInput } from '@/lib/schema';

/**
 * Qualitative trade-off matrix of the scenarios against A on six axes. No numeric score: each cell is a relative level plus the
 * concrete facts behind it. Missing evidence gives `unknown`. Market is only the existence of a local chain (PAM area), never price or profit.
 */
export type TradeoffAxis = 'water' | 'soil' | 'erosion' | 'diseases' | 'calendar' | 'market';
export type TradeoffLevel = 'reference' | 'better' | 'similar' | 'worse' | 'unknown';
export type TradeoffCell = { axis: TradeoffAxis; level: TradeoffLevel; summary: string; summaryEn: string; evidence: string[]; sourceRefs: string[]; missing: string[] };
export type TradeoffSummary = { gains: string[]; losses: string[]; unknowns: string[]; gainsEn: string[]; lossesEn: string[]; unknownsEn: string[] };
export type ScenarioTradeoffs = { cells: TradeoffCell[]; summary: TradeoffSummary };

export const TRADEOFF_AXES: TradeoffAxis[] = ['water', 'soil', 'erosion', 'diseases', 'calendar', 'market'];
export const AXIS_LABELS: Record<TradeoffAxis, { pt: string; en: string }> = { water: { pt: 'Água', en: 'Water' }, soil: { pt: 'Solo', en: 'Soil' }, erosion: { pt: 'Erosão', en: 'Erosion' }, diseases: { pt: 'Doenças', en: 'Diseases' }, calendar: { pt: 'Calendário', en: 'Calendar' }, market: { pt: 'Mercado local', en: 'Local market' } };
/** Which axes each farmer priority feeds; used only to order lists, never to weight levels. */
export const PRIORITY_AXES: Record<PriorityKey, TradeoffAxis[]> = { water: ['water'], soil: ['soil', 'erosion'], operations: ['calendar', 'market'] };
/** Declared screening tolerance (not agronomic): window P−ET0 sums closer than this are "similar". */
export const WATER_TOLERANCE_MM = 20;

export function orderAxes(priorities: AnalysisInput['priorities']): TradeoffAxis[] {
  const first = [...dominantPriorities(priorities)].flatMap((key) => PRIORITY_AXES[key]);
  return [...new Set([...first, ...TRADEOFF_AXES])];
}

const getCrop = (id: string | null | undefined): Crop | undefined => id ? cropById.get(id as Crop['id']) : undefined;
const nPt = (value: number, digits = 0) => Number(value.toFixed(digits)).toLocaleString('pt-BR', { maximumFractionDigits: digits });
const nEn = (value: number, digits = 0) => Number(value.toFixed(digits)).toLocaleString('en-US', { maximumFractionDigits: digits });
const joinUnique = (items: string[]) => [...new Set(items)].join(', ');
const slotCrops = (scenario: Rotation): Crop[] => scenario.slots.flatMap((slot) => { const crop = getCrop(slot.cropId); return crop ? [crop] : []; });
const distinguishing = (scenario: Rotation): Crop | undefined => getCrop(scenario.slots[1]?.cropId) ?? getCrop(scenario.proposedCrop?.cropId);
const compare = (x: number, a: number, lowerIsBetter: boolean, tolerance = 0): 'better' | 'similar' | 'worse' => Math.abs(x - a) <= tolerance ? 'similar' : (x < a) === lowerIsBetter ? 'better' : 'worse';

type Ctx = { input: Pick<AnalysisInput, 'priorities'>; climate: ClimateContext; regionalContext: BrazilRegionalContext };
type Draft = Omit<TradeoffCell, 'axis' | 'level'> & { level: Exclude<TradeoffLevel, 'reference'> };
const unknownDraft = (pt: string, en: string, missing: string[], evidence: string[] = [], sourceRefs: string[] = []): Draft => ({ level: 'unknown', summary: `Não sabemos: ${pt}`, summaryEn: `We do not know: ${en}`, evidence, sourceRefs, missing });

function water(scenario: Rotation, base: Rotation, ctx: Ctx): Draft {
  const slot = scenario.slots[1]; const slotA = base.slots[1];
  const sum = slot?.indicators.find((item) => item.id === 'window_water_balance')?.value ?? null; const sumA = slotA?.indicators.find((item) => item.id === 'window_water_balance')?.value ?? null;
  const crop = distinguishing(scenario); const kc = peakKcOf(crop); const kcA = peakKcOf(distinguishing(base));
  const refs = [ctx.climate.provenance?.sourceUrl, ...[crop, distinguishing(base)].flatMap((item) => { const url = item ? verifiedCropEvidence(item.id, 'kcStages')?.source.url : undefined; return url ? [url] : []; })].filter((value): value is string => Boolean(value));
  const evidence = [sum !== null ? `P−ET0 acumulado na janela da safrinha (${crop?.commonNames['pt-BR'] ?? 'sem cultura'}): ${nPt(sum)} mm${sumA !== null && scenario.id !== 'A' ? ` (A: ${nPt(sumA)} mm)` : ''}` : 'P−ET0 da janela da safrinha indisponível', kc ? `Kc de pico FAO-56 documentado de ${crop!.commonNames['pt-BR']}: ${nPt(kc.kc, 2)} (${kc.stage})${kcA && scenario.id !== 'A' ? `; A: ${nPt(kcA.kc, 2)}` : ''}` : 'Kc de pico não documentado para a cultura da safrinha'];
  const missing = [...(sum === null || sumA === null ? ['window_water_balance'] : []), ...(kc ? [] : ['documented_kc'])];
  if (sum === null || sumA === null) return { ...unknownDraft('o balanço P−ET0 da janela da safrinha não está disponível para comparar.', 'the safrinha window P−ET0 balance is not available to compare.', missing, evidence, refs) };
  const level = compare(sum, sumA, false, WATER_TOLERANCE_MM);
  const diff = sum - sumA;
  return { level, summary: level === 'similar' ? `Janela da safrinha com balanço P−ET0 parecido com o de A (${nPt(sum)} vs ${nPt(sumA)} mm).` : `Janela da safrinha com ${nPt(Math.abs(diff))} mm ${level === 'better' ? 'a mais' : 'a menos'} de P−ET0 que A (contexto climático, não é ETc nem irrigação).`, summaryEn: level === 'similar' ? `Safrinha window P−ET0 similar to A (${nEn(sum)} vs ${nEn(sumA)} mm).` : `Safrinha window has ${nEn(Math.abs(diff))} mm ${level === 'better' ? 'more' : 'less'} P−ET0 than A (climate context, not ETc or irrigation).`, evidence, sourceRefs: refs, missing };
}

function soilFeatures(scenario: Rotation) {
  const crops = slotCrops(scenario); const unique = [...new Map(crops.map((crop) => [crop.id, crop])).values()];
  return { crops: unique, cover: unique.filter((crop) => crop.purposes.includes('cover')), fixers: unique.filter((crop) => crop.nitrogenFixationPotential), residue: unique.filter((crop) => crop.residuePotential), families: [...new Set(unique.map((crop) => crop.family))] };
}
function soil(scenario: Rotation, base: Rotation): Draft {
  const f = soilFeatures(scenario); const a = soilFeatures(base);
  if (!f.crops.length) return unknownDraft('o cenário não tem cultura configurada nos slots.', 'the scenario has no crop configured in its slots.', ['unconfigured_lab_slots']);
  const names = (crops: Crop[]) => joinUnique(crops.map((crop) => crop.commonNames['pt-BR']));
  const evidence = [f.cover.length ? `Cobertura catalogada: ${names(f.cover)}` : 'Sem cultura de cobertura na sequência', f.fixers.length ? `Fixação de N documentada: ${names(f.fixers)}` : 'Sem fixação de N documentada na sequência', f.residue.length ? `Potencial de palha documentado: ${names(f.residue)}` : 'Potencial de palha não documentado para a sequência', `${f.families.length} família(s) botânica(s): ${f.families.join(', ')}`];
  const missing = [...(f.residue.length ? [] : ['residue_potential']), ...(f.fixers.length ? [] : ['documented_nitrogen_fixation'])];
  const sourceRefs = [...new Set([...f.cover, ...f.fixers, ...f.residue].flatMap((crop) => crop.sourceRefs))];
  const delta = (x: number, y: number) => Math.sign(x - y);
  const score = [delta(f.cover.length > 0 ? 1 : 0, a.cover.length > 0 ? 1 : 0), delta(f.fixers.length > 0 ? 1 : 0, a.fixers.length > 0 ? 1 : 0), delta(f.residue.length > 0 ? 1 : 0, a.residue.length > 0 ? 1 : 0), delta(f.families.length, a.families.length)];
  const g = score.filter((value) => value > 0).length; const l = score.filter((value) => value < 0).length;
  const level: Draft['level'] = scenario.id === 'A' ? 'similar' : g > l ? 'better' : l > g ? 'worse' : 'similar';
  const rel = (crops: Crop[], pt: boolean) => crops.length ? joinUnique(crops.map((crop) => crop.commonNames[pt ? 'pt-BR' : 'en'])) : (pt ? 'não documentado' : 'not documented');
  const diffs = (pt: boolean) => [
    f.cover.length !== a.cover.length || (f.cover.length > 0) !== (a.cover.length > 0) ? `${pt ? 'cobertura' : 'cover'}: ${rel(f.cover, pt)} vs A: ${rel(a.cover, pt)}` : null,
    (f.fixers.length > 0) !== (a.fixers.length > 0) ? `${pt ? 'fixação de N' : 'N fixation'}: ${rel(f.fixers, pt)} vs A: ${rel(a.fixers, pt)}` : null,
    (f.residue.length > 0) !== (a.residue.length > 0) ? `${pt ? 'palhada documentada' : 'documented residue'}: ${rel(f.residue, pt)} vs A: ${rel(a.residue, pt)}` : null,
    f.families.length !== a.families.length ? `${pt ? 'famílias' : 'families'}: ${f.families.length} (${f.families.join(', ')}) vs A: ${a.families.length} (${a.families.join(', ')})` : null,
  ].filter(Boolean).join('; ');
  const sm = (pt: boolean) => `${diffs(pt)}${pt ? '. Palha após a colheita só entra se documentada.' : '. Residue after harvest only counts when documented.'}`;
  return { level, summary: level === 'similar' && !diffs(true) ? 'Perfil de solo parecido com o de A.' : level === 'similar' ? `Perfil de solo parecido com A (ganhos e perdas se compensam): ${sm(true)}` : `${level === 'better' ? 'Melhor' : 'Pior'} que A em solo: ${sm(true)}`, summaryEn: level === 'similar' && !diffs(false) ? 'Soil profile similar to A.' : level === 'similar' ? `Soil profile similar to A (gains and losses offset): ${sm(false)}` : `${level === 'better' ? 'Better' : 'Worse'} than A in soil: ${sm(false)}`, evidence, sourceRefs, missing };
}

function erosion(scenario: Rotation, base: Rotation): Draft {
  const b = scenario.bareSoil; const a = base.bareSoil;
  if (!b || !a || b.windowsSource === 'unknown' || a.windowsSource === 'unknown') return unknownDraft('sem janelas de todas as culturas não dá para montar o calendário de solo coberto.', 'without windows for every crop the covered-soil calendar cannot be built.', b?.missing ?? ['unconfigured_lab_slots'], b ? [b.detail] : [], b?.sourceRefs ?? []);
  const steep = (item: typeof b) => Boolean(item.slope && item.slope.meanPct >= 8);
  const highDiff = b.bareMonthsInHighErosivity.length - a.bareMonthsInHighErosivity.length; const slopeDiff = Number(steep(b) && b.bareMonths.length > 0) - Number(steep(a) && a.bareMonths.length > 0);
  const level: Draft['level'] = highDiff !== 0 ? (highDiff < 0 ? 'better' : 'worse') : slopeDiff !== 0 ? (slopeDiff < 0 ? 'better' : 'worse') : 'similar';
  const src = b.windowsSource === 'documented' ? 'ciclos documentados' : b.windowsSource === 'assumed' ? 'janelas presumidas' : 'ciclos documentados e presumidos'; const srcEn = b.windowsSource === 'documented' ? 'documented cycles' : b.windowsSource === 'assumed' ? 'assumed windows' : 'documented and assumed cycles';
  const noneHigh = b.bareMonthsInHighErosivity.length === 0 && a.bareMonthsInHighErosivity.length === 0;
  const evidence = [`${b.bareMonthsInHighErosivity.length} mês(es) descoberto(s) em meses de chuva mais erosiva; em A: ${a.bareMonthsInHighErosivity.length}`, ...(noneHigh ? ['meses descobertos fora do período de maior erosividade'] : []), `${b.bareMonths.length} de 24 meses potencialmente descobertos (${src}); em A: ${a.bareMonths.length} (total de meses descobertos é tratado no eixo Solo)`, b.slope ? `Declividade SRTM média ${nPt(b.slope.meanPct, 1)}%` : 'Declividade SRTM indisponível'];
  return { level, summary: `${b.bareMonthsInHighErosivity.length} mês(es) descoberto(s) em meses de chuva mais erosiva${level === 'similar' ? (scenario.id === 'A' ? '' : ', como em A') : level === 'better' ? ' (menos que A)' : ' (mais que A)'}${noneHigh ? '; meses descobertos fora do período de maior erosividade' : ''}. Baseado em ${src}; palha não modelada.`, summaryEn: `${b.bareMonthsInHighErosivity.length} bare month(s) in higher-erosivity months${level === 'similar' ? (scenario.id === 'A' ? '' : ', same as A') : level === 'better' ? ' (fewer than A)' : ' (more than A)'}${noneHigh ? '; bare months fall outside the highest-erosivity period' : ''}. Based on ${srcEn}; residue not modelled.`, evidence, sourceRefs: b.sourceRefs, missing: b.missing };
}

function repetitions(slots: LabSlotAssessment[]): Array<{ from: Crop; to: Crop }> {
  return slots.flatMap((slot, index) => { const to = getCrop(slot.cropId); const from = getCrop(slot.previousCropId); return to && from && from.family === to.family && (index > 0 || from.id !== to.id) ? [{ from, to }] : []; });
}
function diseases(scenario: Rotation, base: Rotation): Draft {
  if (scenario.slots.length < 4 || scenario.slots.some((slot) => !slot.cropId)) return unknownDraft('há slots sem cultura; a repetição de família não pode ser verificada.', 'some slots have no crop; family repetition cannot be checked.', ['unconfigured_lab_slots']);
  const reps = repetitions(scenario.slots); const repsA = repetitions(base.slots);
  const level: Draft['level'] = reps.length === repsA.length ? 'similar' : reps.length < repsA.length ? 'better' : 'worse';
  const pairText = reps.map((item) => `${item.from.commonNames['pt-BR']}→${item.to.commonNames['pt-BR']} (${item.to.family})`);
  const notes = [...new Set(reps.flatMap((item) => [...(item.from.diseaseNotes ?? []), ...(item.to.diseaseNotes ?? [])]))];
  const evidence = [reps.length ? `Repetição de família botânica: ${joinUnique(pairText)}` : 'Sem repetição de família entre slots consecutivos', ...(scenario.id !== 'A' ? [`Repetições em A: ${repsA.length}`] : []), ...(reps.length ? (notes.length ? notes.map((note) => `Nota documentada no catálogo: ${note}`) : ['Nenhuma doença específica documentada no catálogo para estas culturas; não afirmamos doenças.']) : [])];
  const sourceRefs = [...new Set(reps.flatMap((item) => [...item.from.sourceRefs, ...item.to.sourceRefs]))];
  const fam = joinUnique(reps.map((item) => item.to.family));
  return { level, summary: reps.length ? `${reps.length} repetição(ões) de família botânica (${fam}) entre slots consecutivos${scenario.id !== 'A' ? `; A: ${repsA.length}` : ''}.${notes.length ? ' Há notas de doença documentadas no catálogo.' : ' Doenças específicas não documentadas.'}` : `Sem repetição de família entre slots consecutivos${scenario.id !== 'A' ? `; A: ${repsA.length}` : ''}.`, summaryEn: reps.length ? `${reps.length} botanical-family repetition(s) (${fam}) between consecutive slots${scenario.id !== 'A' ? `; A: ${repsA.length}` : ''}.${notes.length ? ' Disease notes are documented in the catalog.' : ' Specific diseases are not documented.'}` : `No family repetition between consecutive slots${scenario.id !== 'A' ? `; A: ${repsA.length}` : ''}.`, evidence, sourceRefs, missing: reps.length && !notes.length ? ['documented_disease_notes'] : [] };
}

const known = (slots: LabSlotAssessment[]) => slots.filter((slot) => slot.zarc && slot.zarc.status !== 'unknown');
function zarcStats(slots: LabSlotAssessment[]) { const items = known(slots); return { items, notIndicated: items.filter((slot) => slot.zarc!.status === 'not_indicated'), worstRisk: Math.max(0, ...items.flatMap((slot) => slot.zarc!.riskLevelPct ? [slot.zarc!.riskLevelPct] : [])) }; }
function calendar(scenario: Rotation, base: Rotation): Draft {
  const s = zarcStats(scenario.slots); const a = zarcStats(base.slots);
  const missing = scenario.slots.some((slot) => !slot.zarc || slot.zarc.status === 'unknown') ? ['zarc_window'] : [];
  if (!s.items.length || !a.items.length) return unknownDraft('o ZARC não traz a janela de plantio destas culturas/meses neste município.', 'ZARC has no planting window for these crops/months in this municipality.', ['zarc_window']);
  const label = (slot: LabSlotAssessment) => `${slot.cropName ?? '?'} em ${MONTH_ABBR[slot.zarc!.month - 1]}: ${slot.zarc!.status === 'indicated' ? `indicado (risco ${slot.zarc!.riskLevelPct}%)` : 'não indicado'}`;
  const level: Draft['level'] = s.notIndicated.length !== a.notIndicated.length ? (s.notIndicated.length < a.notIndicated.length ? 'better' : 'worse') : s.worstRisk !== a.worstRisk ? (s.worstRisk < a.worstRisk ? 'better' : 'worse') : 'similar';
  const sourceRefs = [...new Set(s.items.flatMap((slot) => slot.zarc!.sourceRefs.map((ref) => ref.url)))];
  /** A "similar" verdict needs a ZARC reading for every slot; crops absent from ZARC (e.g. cover crops) leave the calendar unknown instead. */
  const unread = scenario.slots.filter((slot) => slot.cropId && (!slot.zarc || slot.zarc.status === 'unknown'));
  if (level === 'similar' && unread.length) return unknownDraft(`o ZARC não traz janela para ${joinUnique(unread.map((slot) => slot.cropName ?? '?'))} neste município; só os demais slots foram lidos.`, `ZARC has no window for ${joinUnique(unread.map((slot) => slot.cropId ?? '?'))} in this municipality; only the other slots were read.`, ['zarc_window'], s.items.map(label), sourceRefs);
  const base2 = s.notIndicated.length ? `${s.notIndicated.length} slot(s) com plantio fora do período indicado pelo ZARC` : `Todos os slots com leitura ZARC dentro do período indicado${s.worstRisk ? ` (risco máximo ${s.worstRisk}%)` : ''}`;
  const base2En = s.notIndicated.length ? `${s.notIndicated.length} slot(s) planted outside the ZARC-indicated period` : `All slots with a ZARC reading fall in the indicated period${s.worstRisk ? ` (highest risk ${s.worstRisk}%)` : ''}`;
  return { level, summary: `${base2}${scenario.id !== 'A' ? `; A: ${a.notIndicated.length}` : ''}. Zoneamento de risco, não garantia.`, summaryEn: `${base2En}${scenario.id !== 'A' ? `; A: ${a.notIndicated.length}` : ''}. Risk zoning, not a guarantee.`, evidence: s.items.map(label), sourceRefs, missing };
}

function market(scenario: Rotation, base: Rotation, ctx: Ctx): Draft {
  const pam = ctx.regionalContext.pam; const crop = distinguishing(scenario); const cropA = distinguishing(base);
  if (!pam || !crop) return unknownDraft('não há dado PAM municipal carregado para este local, então a cadeia local não pode ser verificada.', 'no municipal PAM data is loaded for this location, so the local chain cannot be checked.', ['pam_municipal'], [], pam ? [pam.sourceUrl] : []);
  const area = (item: Crop | undefined) => { const found = item ? pam.products.filter((product) => product.cropIds.includes(item.id) && product.harvestedAreaHa !== null && product.harvestedAreaHa > 0) : []; return found.length ? Math.max(...found.map((product) => product.harvestedAreaHa as number)) : 0; };
  const x = area(crop); const y = area(cropA);
  const fact = (item: Crop, value: number) => value > 0 ? `existe cadeia local de ${item.commonNames['pt-BR']}: ${nPt(value)} ha colhidos em ${pam.year}` : `sem área colhida de ${item.commonNames['pt-BR']} registrada no PAM ${pam.year}`;
  const factEn = (item: Crop, value: number) => value > 0 ? `local ${item.commonNames.en} chain exists: ${nEn(value)} ha harvested in ${pam.year}` : `no harvested area of ${item.commonNames.en} recorded in PAM ${pam.year}`;
  const level: Draft['level'] = scenario.id === 'A' ? 'similar' : (x > 0) === (y > 0) ? 'similar' : x > 0 ? 'better' : 'worse';
  const evidence = [fact(crop, x), ...(scenario.id !== 'A' && cropA ? [`A: ${fact(cropA, y)}`] : []), pam.caveat];
  /** A cover-only crop is not sold: "worse" here means the safrinha income A has is lost, not that the crop is bad. */
  const coverOnly = !crop.purposes.includes('commercial') && crop.purposes.includes('cover');
  if (coverOnly && level === 'worse' && cropA) return { level, summary: `Cultura de cobertura: "pior" aqui significa perda da renda da safrinha, pois ela não é vendida (A vende ${cropA.commonNames['pt-BR']}, com cadeia local de ${nPt(y)} ha em ${pam.year}). O ganho dela é no solo, não na renda.`, summaryEn: `Cover crop: "worse" here means loss of second-crop (safrinha) income, since it is not sold (A sells ${cropA.commonNames.en}, with a local chain of ${nEn(y)} ha in ${pam.year}). Its gain is in the soil, not in income.`, evidence, sourceRefs: [pam.sourceUrl], missing: [] };
  return { level, summary: `${fact(crop, x)[0]!.toUpperCase()}${fact(crop, x).slice(1)} (PAM municipal; indica cadeia local, não preço nem lucro).`, summaryEn: `${factEn(crop, x)[0]!.toUpperCase()}${factEn(crop, x).slice(1)} (municipal PAM; indicates a local chain, not price or profit).`, evidence, sourceRefs: [pam.sourceUrl], missing: [] };
}

function summarize(cells: TradeoffCell[], order: TradeoffAxis[]): TradeoffSummary {
  const sorted = [...cells].sort((p, q) => order.indexOf(p.axis) - order.indexOf(q.axis));
  const pick = (level: TradeoffLevel) => sorted.filter((cell) => cell.level === level);
  const line = (cell: TradeoffCell, en: boolean) => `${AXIS_LABELS[cell.axis][en ? 'en' : 'pt']}: ${en ? cell.summaryEn : cell.summary}`;
  return { gains: pick('better').map((cell) => line(cell, false)), losses: pick('worse').map((cell) => line(cell, false)), unknowns: pick('unknown').map((cell) => AXIS_LABELS[cell.axis].pt), gainsEn: pick('better').map((cell) => line(cell, true)), lossesEn: pick('worse').map((cell) => line(cell, true)), unknownsEn: pick('unknown').map((cell) => AXIS_LABELS[cell.axis].en) };
}

/** Builds the six-axis matrix for every scenario relative to scenario A (A is the reference). Pure; reads `bareSoil` and slot `zarc` already attached. */
export function buildTradeoffs(scenarios: Rotation[], ctx: Ctx): Map<Rotation['id'], ScenarioTradeoffs> {
  const base = scenarios.find((item) => item.id === 'A') ?? scenarios[0]; const order = orderAxes(ctx.input.priorities);
  return new Map(scenarios.map((scenario) => {
    const drafts: Record<TradeoffAxis, Draft> = { water: water(scenario, base, ctx), soil: soil(scenario, base), erosion: erosion(scenario, base), diseases: diseases(scenario, base), calendar: calendar(scenario, base), market: market(scenario, base, ctx) };
    const cells = TRADEOFF_AXES.map((axis): TradeoffCell => ({ axis, ...drafts[axis], level: scenario.id === base.id && drafts[axis].level !== 'unknown' ? 'reference' : drafts[axis].level }));
    return [scenario.id, { cells, summary: summarize(cells, order) }];
  }));
}
