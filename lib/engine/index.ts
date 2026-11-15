import { analysisInputSchema, type AnalysisInput, type SoilProfile } from '@/lib/schema';
import { cropById, isAnnualRotationEligible, verifiedCropEvidence, type Crop } from '@/lib/catalog';
import type { ClimateContext } from '@/lib/climate/nasa-power';
import type { AnalysisResult, Explanation, Rotation, ValidationLevel } from '@/lib/engine/types';
import { createDefaultLabPlan, labPrimaryCrop, type LabPlan } from '@/lib/lab';
import { detectCurrentPattern, detectCurrentPatternDetailed } from '@/lib/lab/sequence';
import type { BrazilRegionalContext } from '@/lib/brazil/types';
import { deriveNasaInsights } from '@/lib/engine/nasa-insight';
import { assessCropIndicators } from '@/lib/engine/indicators';
import { assessLabPlan } from '@/lib/lab/assessment';
import { buildEvidenceManifest } from '@/lib/evidence/manifest';
import { analyzeBoundary } from '@/lib/engine/boundary-context';
import { isBlockedCrop, permittedCatalogCrops } from '@/lib/farmer-profile';
import { assessSoilHealth } from '@/lib/engine/soil-health';
import { deriveDataQuality } from '@/lib/engine/data-quality';
import { cropsInSystem, summarizeCroppingSystem } from '@/lib/intercrops';
import { aggregateIndicators, aggregateSoilHealth } from '@/lib/engine/aggregate';
import { safrinhaMonth } from '@/lib/engine/slot-season';
import { alignPriorities, dominantPriorities, pickCover, pickThird, selectionNote, selectionTitle } from '@/lib/engine/priorities';

/** Optional server-side context kept apart from farmer input; regional soil is a municipal estimate, never farmer-declared. */
export type AnalyzeOptions = { regionalSoil?: SoilProfile };

const P0 = ['soybean', 'maize', 'sorghum', 'sunflower', 'cowpea', 'common_bean', 'upland_rice', 'ruziziensis'] as const;
const EMPTY_CLIMATE: ClimateContext = { status: 'unavailable', origin: 'unavailable', monthly: [], plantingMonthPrecipitation: null, historicalPrecipitationByMonth: [], provenance: null, gaps: ['Climate context was not supplied to the pure engine.'] };
const EMPTY_REGIONAL_CONTEXT: BrazilRegionalContext = { country: null, municipality: null, municipalitySource: null, zarc: null, pam: null, gaps: ['Regional context was not supplied to the pure engine.'] };
export function validateInputs(input: unknown) { return analysisInputSchema.safeParse(input); }
function cropName(crop: Crop): string { return crop.commonNames['pt-BR']; }
function getCrop(id: string): Crop | undefined { return cropById.get(id as Crop['id']); }
function zarcHas(context: BrazilRegionalContext, cropId: string | undefined): boolean { return Boolean(cropId && context.zarc?.crops[cropId]); }
function proposed(crop: Crop, plantingMonth: number | null) { return { cropId: crop.id, name: cropName(crop), plantingMonth, durationDays: null, family: crop.family, purposes: crop.purposes }; }
function level(context: BrazilRegionalContext, cropId: string | undefined): ValidationLevel { return zarcHas(context, cropId) ? 'regionally_contextualized' : 'climate_exploration'; }
function strategy(id: 'A' | 'B' | 'C', title: string, crop: Crop | undefined, input: AnalysisInput, climate: ClimateContext, regionalContext: BrazilRegionalContext, baseline = false, assumed = false, reason?: string, extraNotes: Explanation[] = [], regionalSoil?: SoilProfile, plantingMonth: number | null = input.plantingMonth): Rotation {
  const missing = [...new Set([...(crop ? ['cycle_duration'] : ['eligible_crop']), ...(climate.status === 'available' ? [] : ['historical_climate']), ...(crop?.viableTempC ? [] : ['documented_temperature_range']), ...((input.soil?.ph === undefined && regionalSoil?.ph === undefined) || (input.soil?.ph !== undefined && !crop?.soilPhRange) ? ['soil_ph_or_verified_range'] : [])])];
  const cropId = crop?.id; const regional = zarcHas(regionalContext, cropId);
  const croppingSystems = (input.croppingSystems ?? []).map((system) => ({ plotId: system.plotId, type: system.type, ...summarizeCroppingSystem(system, cropId) }));
  const applicableSystems = croppingSystems.filter((system) => system.appliesToStrategy);
  const declaredCompanions = (input.croppingSystems ?? []).filter((system) => cropId && system.events.some((event) => event.cropId === cropId)).flatMap(cropsInSystem);
  const explanations: Explanation[] = [
    ...(assumed ? [{ kind: 'limitation' as const, message: 'Continuação presumida baseada no último evento; confirme ou edite o plano.', ruleId: 'BASELINE_PRESUMED', sourceRefs: [], certainty: 'low' as const, missingData: ['futureBaseline'] }] : []),
    ...(reason ? [{ kind: 'limitation' as const, message: reason, ruleId: 'SELECTION_GAP', sourceRefs: [], certainty: 'high' as const, missingData: ['documented_criteria'] }] : []),
    ...extraNotes,
    ...(input.soil?.ph === undefined && regionalSoil?.ph !== undefined ? [{ kind: 'limitation' as const, message: 'Sem análise de solo do produtor: o pH vem de estimativa regional (SoilGrids, média municipal 0–30 cm), não do talhão. Use análise local para decidir.', ruleId: 'REGIONAL_SOIL_ESTIMATE_ONLY', sourceRefs: [], certainty: 'medium' as const, missingData: ['local_soil_analysis'] }] : []),
    ...(regional ? [{ kind: 'benefit' as const, message: `Contexto regional ZARC ${regionalContext.zarc?.safra} disponível para ${regionalContext.municipality?.name} (${regionalContext.municipality?.uf}); códigos brutos são preservados sem interpretação.`, ruleId: 'BRAZIL_MUNICIPAL_ZARC_CONTEXT', sourceRefs: regionalContext.zarc ? [regionalContext.zarc.sourceUrl] : [], certainty: 'high' as const, missingData: [] }] : []),
    ...(id === 'C' && crop?.kcStages && climate.waterContext && (climate.waterContext.rootZoneWetnessMedian !== null || climate.waterContext.medianRainDays !== null) ? [{ kind: 'limitation' as const, message: 'O contexto hídrico combina exposição histórica NASA com um perfil Kc documentado para a cultura. O perfil é específico da fonte e não calcula ETc, consumo, irrigação ou superioridade hídrica.', ruleId: 'NASA_EXPOSURE_WITH_DOCUMENTED_KC', sourceRefs: [climate.provenance?.sourceUrl, verifiedCropEvidence(crop.id, 'kcStages')?.source.url].filter((value): value is string => Boolean(value)), certainty: 'medium' as const, missingData: [] }] : []),
    ...applicableSystems.map((system): Explanation => ({ kind: system.type === 'intercrop' ? 'risk' : 'limitation', message: system.type === 'intercrop' ? `A hipótese participa do consórcio declarado “${system.plotId}”. ${system.risks.join(' ') || 'Competição e efeitos permanecem desconhecidos.'}` : `A hipótese participa do sistema declarado “${system.plotId}” (${system.type}); as datas informadas descrevem ordem, sem presumir benefício agronômico.`, ruleId: system.type === 'intercrop' ? 'DECLARED_INTERCROP_EXPOSURE' : 'DECLARED_SEQUENCE_CONTEXT', sourceRefs: system.sourceRefs, certainty: system.documentedExample ? 'medium' : 'low', missingData: system.documentedExample ? ['local_validation'] : ['compatible_system_evidence', 'local_validation'] })),
    ...(croppingSystems.length && !applicableSystems.length ? [{ kind: 'limitation' as const, message: 'Os sistemas declarados não incluem a cultura principal desta hipótese; nenhuma diferença agronômica foi atribuída.', ruleId: 'DECLARED_SYSTEM_NOT_APPLICABLE', sourceRefs: [], certainty: 'high' as const, missingData: [] }] : []),
  ];
  const lastCrop = input.history.at(-1)?.cropId ? getCrop(input.history.at(-1)!.cropId!) : undefined;
  const history = input.history.flatMap((event) => event.cropId ? [getCrop(event.cropId)] : []).filter((item): item is Crop => Boolean(item));
  return { id, title, baseline, baselineAssumed: assumed, horizonMonths: 24, proposedCrop: crop ? proposed(crop, plantingMonth) : null, validationLevel: level(regionalContext, cropId), regionalContextAvailable: regional, indicators: assessCropIndicators(crop, lastCrop, input, climate, regionalSoil), soilHealth: assessSoilHealth(input, crop, history, declaredCompanions, regionalSoil), croppingSystems, slots: [], configuredSlots: 0, explanations, missingData: missing, unavailable: !crop };
}
function baselineCrop(input: AnalysisInput): Crop | undefined { const cropId = input.futureBaseline?.confirmed ? input.futureBaseline.cropId : input.history.at(-1)?.cropId; return cropId && isAnnualRotationEligible(cropId) ? getCrop(cropId) : undefined; }
function selectable(input: AnalysisInput): Crop[] { return permittedCatalogCrops(input.farmerCrops); }
export function evaluateConstraints(regionalContext: BrazilRegionalContext): Explanation[] { return regionalContext.zarc ? [] : [{ kind: 'limitation', message: regionalContext.country === 'BR' ? 'O município foi identificado, mas não há contexto ZARC P0 aplicável nesta safra; a exploração climática continua disponível.' : 'A coordenada não foi associada a município brasileiro; a exploração climática global continua disponível.', ruleId: 'GLOBAL_EXPLORATION', sourceRefs: regionalContext.municipalitySource ? [regionalContext.municipalitySource.url] : [], certainty: 'high', missingData: ['regional_source'] }]; }
export function generateCandidates(input: AnalysisInput, climate: ClimateContext = EMPTY_CLIMATE, labPlan?: LabPlan, regionalContext: BrazilRegionalContext = EMPTY_REGIONAL_CONTEXT, options: AnalyzeOptions = {}): Rotation[] {
  const regionalSoil = options.regionalSoil; const lastId = input.history.at(-1)?.cropId; const last = lastId ? getCrop(lastId) : undefined; const dominant = dominantPriorities(input.priorities);
  const confirmed = Boolean(input.futureBaseline?.confirmed); const weakPattern = detectCurrentPatternDetailed(input.history, input.futureBaseline).weak; const pattern = detectCurrentPattern(input.history, input.futureBaseline); const patternIds = pattern.flatMap((id) => id ? [id] : []); const patternMain = pattern[0] && isAnnualRotationEligible(pattern[0]) ? getCrop(pattern[0]) : undefined; const baseline = patternMain ?? baselineCrop(input);
  /** B/C are safrinha alternatives replacing A's safrinha crop, so both crops of the current pattern are excluded from their pools. */
  const patternExcluded = [...patternIds, ...(baseline ? [baseline.id] : [])]; const coverPick = pickCover(selectable(input), last, dominant, patternExcluded); const cover = coverPick.crop; const excluded = [...patternExcluded, ...(cover ? [cover.id] : [])]; const thirdPick = pickThird(selectable(input), last, excluded, dominant); const resilience = thirdPick.crop;
  const baseReason = isBlockedCrop(input.farmerCrops, baseline?.id) ? 'A estratégia atual foi preservada, mas esta cultura está marcada como operacionalmente bloqueada para alternativas futuras.' : undefined;
  const noCoverReason = 'Não há cultura de cobertura disponível ou aceita pelo produtor com evidência catalogada para esta alternativa.';
  const noWaterReason = 'Não há outra cultura disponível ou aceita pelo produtor com requisito térmico documentado para esta comparação.';
  const defaults = [strategy('A', confirmed ? 'Plano do produtor' : weakPattern ? 'Continuidade presumida — confirmar' : 'Plano atual (detectado no histórico)', baseline, input, climate, regionalContext, true, !confirmed && weakPattern, baseReason, [], regionalSoil), strategy('B', selectionTitle('B', coverPick.rule), cover, input, climate, regionalContext, false, false, cover ? undefined : noCoverReason, [selectionNote(coverPick)].filter((note): note is Explanation => Boolean(note)), regionalSoil), strategy('C', selectionTitle('C', thirdPick.rule), resilience, input, climate, regionalContext, false, false, resilience ? undefined : noWaterReason, [selectionNote(thirdPick)].filter((note): note is Explanation => Boolean(note)), regionalSoil)];
  const isDefaultPlan = !labPlan; const plan = labPlan ?? createDefaultLabPlan(input, defaults);
  const assessments = assessLabPlan(input, plan, climate, regionalContext, regionalSoil);
  const historyCrops = input.history.flatMap((event) => event.cropId ? [getCrop(event.cropId)] : []).filter((item): item is Crop => Boolean(item));
  return rankCandidates(defaults.map((item) => {
    const configured = plan.scenarios.find((scenario) => scenario.id === item.id); if (!configured) return item;
    const slotCrop = (index: number) => { const id = configured.slots[index]?.cropId; return id ? getCrop(id) : undefined; };
    /** Default plans are judged by the distinguishing (safrinha) crop; user lab plans keep the first configured slot. */
    const distinguishing = isDefaultPlan ? slotCrop(1) ?? slotCrop(0) : undefined; const labCropId = labPrimaryCrop(plan, item.id);
    const crop = distinguishing ?? (labCropId ? getCrop(labCropId) : undefined) ?? (isDefaultPlan ? getCrop(item.proposedCrop?.cropId ?? '') : undefined);
    const fromSafrinha = Boolean(isDefaultPlan && distinguishing && distinguishing === slotCrop(1));
    const gap = isDefaultPlan ? item.explanations.find((note) => note.ruleId === 'SELECTION_GAP')?.message : undefined;
    const selected = strategy(item.id, isDefaultPlan ? item.title : configured.title, crop, input, climate, regionalContext, item.baseline, item.baselineAssumed, gap ?? (crop ? undefined : 'Nenhuma cultura foi escolhida nos slots do laboratório.'), isDefaultPlan ? item.explanations.filter((note) => note.ruleId.startsWith('PRIORITY_')) : [], regionalSoil, fromSafrinha ? safrinhaMonth(input) : input.plantingMonth);
    const slots = assessments.filter((slot) => slot.scenarioId === item.id); const configuredSlots = slots.filter((slot) => slot.cropId).length;
    return { ...selected, indicators: aggregateIndicators(input, slots, selected.indicators), soilHealth: aggregateSoilHealth(input, slots, selected.soilHealth, historyCrops), slots, configuredSlots, missingData: [...new Set([...selected.missingData, ...(configuredSlots < 4 ? ['unconfigured_lab_slots'] : [])])] };
  }), input);
}
export function computeMetrics(candidate: Rotation): Rotation { return candidate; }
/** Does not reorder: A stays first and ids/positions are stable for the UI. Attaches a qualitative priority alignment to each scenario. */
export function rankCandidates(candidates: Rotation[], input: Pick<AnalysisInput, 'priorities' | 'history'>): Rotation[] { return alignPriorities(candidates, input.priorities, input.history.at(-1)?.cropId); }
export function explain(candidate: Rotation): Explanation[] { return candidate.explanations; }
export function analyze(input: unknown, climate: ClimateContext = EMPTY_CLIMATE, labPlan?: LabPlan, regionalContext: BrazilRegionalContext = EMPTY_REGIONAL_CONTEXT, options: AnalyzeOptions = {}): AnalysisResult {
  const parsed = validateInputs(input); if (!parsed.success) throw new Error(parsed.error.issues.map((issue) => issue.message).join('; '));
  const priorityHighlights = (Object.entries(parsed.data.priorities) as Array<[keyof AnalysisInput['priorities'], number]>).sort((a, b) => b[1] - a[1]).map(([key]) => key === 'water' ? 'root_zone_wetness' : key === 'soil' ? 'cover_potential' : 'functional_diversity');
  const strategies = generateCandidates(parsed.data, climate, labPlan, regionalContext, options);
  const nasaInsightByMonth = deriveNasaInsights(strategies, climate);
  const boundaryAnalysis = analyzeBoundary(parsed.data.fieldBoundary);
  const evidenceManifest = buildEvidenceManifest(strategies, climate, regionalContext, boundaryAnalysis);
  const boundaryWarnings = boundaryAnalysis.status === 'spatial_context' ? ['O polígono entra como contexto espacial. SMAP L4 histórico numérico exige pré-processamento autenticado Earthdata e não foi inferido da camada visual GIBS.'] : [];
  return { strategies, climate, regionalContext, boundaryAnalysis, warnings: [...evaluateConstraints(regionalContext).map((item) => item.message), ...regionalContext.gaps, ...climate.gaps, ...boundaryWarnings], input: parsed.data, regionalContextAvailable: Boolean(regionalContext.zarc), disclaimer: 'Cenários exploratórios; não são recomendação agronômica, validação local, previsão ou prescrição.', priorityHighlights, nasaInsight: nasaInsightByMonth[parsed.data.plantingMonth - 1], nasaInsightByMonth, dataQuality: deriveDataQuality(parsed.data, climate, options.regionalSoil), evidenceManifest };
}
