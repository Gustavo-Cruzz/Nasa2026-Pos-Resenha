import { analysisInputSchema, type AnalysisInput } from '@/lib/schema';
import { cropById, type Crop } from '@/lib/catalog';
import type { ClimateContext } from '@/lib/climate/nasa-power';
import type { AnalysisResult, Explanation, IndicatorState, QualitativeIndicator, Rotation, ValidationLevel } from '@/lib/engine/types';
import { labPrimaryCrop, type LabPlan } from '@/lib/lab';
import type { BrazilRegionalContext } from '@/lib/brazil/types';

const P0 = ['soybean', 'maize', 'sorghum', 'sunflower', 'cowpea', 'common_bean', 'upland_rice', 'ruziziensis'] as const;
const EMPTY_CLIMATE: ClimateContext = { status: 'unavailable', origin: 'unavailable', monthly: [], plantingMonthPrecipitation: null, provenance: null, gaps: ['Climate context was not supplied to the pure engine.'] };
const EMPTY_REGIONAL_CONTEXT: BrazilRegionalContext = { country: null, municipality: null, municipalitySource: null, zarc: null, pam: null, gaps: ['Regional context was not supplied to the pure engine.'] };
export function validateInputs(input: unknown) { return analysisInputSchema.safeParse(input); }
function cropName(crop: Crop): string { return crop.commonNames['pt-BR']; }
function getCrop(id: string): Crop | undefined { return cropById.get(id as Crop['id']); }
function zarcHas(context: BrazilRegionalContext, cropId: string | undefined): boolean { return Boolean(cropId && context.zarc?.crops[cropId]); }
function proposed(crop: Crop, input: AnalysisInput) { return { cropId: crop.id, name: cropName(crop), plantingMonth: input.plantingMonth, durationDays: null, family: crop.family, purposes: crop.purposes }; }
function level(context: BrazilRegionalContext, cropId: string | undefined): ValidationLevel { return zarcHas(context, cropId) ? 'regionally_contextualized' : 'climate_exploration'; }
function cropIndicators(crop: Crop | undefined, input: AnalysisInput, climate: ClimateContext): QualitativeIndicator[] {
  const last = input.history.at(-1)?.cropId ? getCrop(input.history.at(-1)!.cropId!) : undefined;
  const thermal: IndicatorState = !crop?.viableTempC || climate.status !== 'available' ? 'unknown' : (() => { const observed = climate.monthly.find((item) => item.month === input.plantingMonth)?.tmeanMedianC; return observed === null || observed === undefined ? 'unknown' : observed >= crop.viableTempC.min && observed <= crop.viableTempC.max ? 'compatible' : 'attention'; })();
  const rain = climate.plantingMonthPrecipitation;
  const diversity: IndicatorState = !crop || !last ? 'unknown' : crop.family === last.family ? 'attention' : 'compatible';
  const soil: IndicatorState = input.soil?.ph === undefined || !crop?.soilPhRange ? 'unknown' : input.soil.ph >= crop.soilPhRange.min && input.soil.ph <= crop.soilPhRange.max ? 'compatible' : 'attention';
  return [
    { id: 'thermal_compatibility', label: 'Compatibilidade térmica', state: thermal, detail: thermal === 'unknown' ? 'Faixa térmica documentada e/ou clima histórico indisponível.' : 'Comparação exploratória com a climatologia mensal NASA.', sourceRefs: crop?.sourceRefs ?? [] },
    { id: 'historical_precipitation', label: 'Precipitação histórica no mês', state: rain?.medianTotalMm === null || !rain ? 'unknown' : 'observed', detail: rain?.medianTotalMm === null || !rain ? 'Sem observação histórica disponível.' : `${rain.medianTotalMm} mm (mediana histórica; cobertura de ${rain.coveragePct}%). Não é demanda hídrica.`, sourceRefs: climate.provenance ? [climate.provenance.sourceUrl] : [] },
    { id: 'cover_potential', label: 'Potencial de cobertura', state: !crop ? 'unknown' : crop.purposes.includes('cover') ? 'yes' : 'no', detail: !crop ? 'Sem cultura proposta.' : crop.purposes.includes('cover') ? 'Finalidade de cobertura catalogada; não estima carbono, N ou fertilidade.' : 'Finalidade de cobertura não catalogada.', sourceRefs: crop?.sourceRefs ?? [] },
    { id: 'functional_diversity', label: 'Diversidade funcional', state: diversity, detail: diversity === 'unknown' ? 'Família da cultura anterior ou proposta desconhecida.' : diversity === 'compatible' ? 'Família diferente do último evento registrado.' : 'Mesma família do último evento registrado.', sourceRefs: crop?.sourceRefs ?? [] },
    { id: 'soil_context', label: 'Contexto de solo (pH)', state: soil, detail: soil === 'unknown' ? 'pH informado e faixa de pH verificável são necessários.' : soil === 'compatible' ? 'pH informado dentro da faixa documentada.' : 'pH informado fora da faixa documentada.', sourceRefs: crop?.sourceRefs ?? [] },
  ];
}
function strategy(id: 'A' | 'B' | 'C', title: string, crop: Crop | undefined, input: AnalysisInput, climate: ClimateContext, regionalContext: BrazilRegionalContext, baseline = false, assumed = false, reason?: string): Rotation {
  const missing = [...new Set([...(crop ? ['cycle_duration'] : ['eligible_crop']), ...(climate.status === 'available' ? [] : ['historical_climate']), ...(crop?.viableTempC ? [] : ['documented_temperature_range']), ...(input.soil?.ph === undefined || !crop?.soilPhRange ? ['soil_ph_or_verified_range'] : [])])];
  const cropId = crop?.id; const regional = zarcHas(regionalContext, cropId);
  const explanations: Explanation[] = [
    ...(assumed ? [{ kind: 'limitation' as const, message: 'Continuação presumida baseada no último evento; confirme ou edite o plano.', ruleId: 'BASELINE_PRESUMED', sourceRefs: [], certainty: 'low' as const, missingData: ['futureBaseline'] }] : []),
    ...(reason ? [{ kind: 'limitation' as const, message: reason, ruleId: 'SELECTION_GAP', sourceRefs: [], certainty: 'high' as const, missingData: ['documented_criteria'] }] : []),
    ...(regional ? [{ kind: 'benefit' as const, message: `Contexto regional ZARC ${regionalContext.zarc?.safra} disponível para ${regionalContext.municipality?.name} (${regionalContext.municipality?.uf}); códigos brutos são preservados sem interpretação.`, ruleId: 'BRAZIL_MUNICIPAL_ZARC_CONTEXT', sourceRefs: regionalContext.zarc ? [regionalContext.zarc.sourceUrl] : [], certainty: 'high' as const, missingData: [] }] : []),
  ];
  return { id, title, baseline, baselineAssumed: assumed, horizonMonths: 24, proposedCrop: crop ? proposed(crop, input) : null, validationLevel: level(regionalContext, cropId), regionalContextAvailable: regional, indicators: cropIndicators(crop, input, climate), explanations, missingData: missing, unavailable: !crop };
}
function baselineCrop(input: AnalysisInput): Crop | undefined { const cropId = input.futureBaseline?.confirmed ? input.futureBaseline.cropId : input.history.at(-1)?.cropId; return cropId ? getCrop(cropId) : undefined; }
function selectCover(input: AnalysisInput): Crop | undefined { const last = input.history.at(-1)?.cropId ? getCrop(input.history.at(-1)!.cropId!) : undefined; const candidates = P0.map((id) => getCrop(id)).filter((crop): crop is Crop => Boolean(crop?.purposes.includes('cover'))); return candidates.find((crop) => !last || crop.family !== last.family) ?? candidates[0]; }
function selectResilience(input: AnalysisInput, excludedCropIds: string[]): Crop | undefined { const last = input.history.at(-1)?.cropId ? getCrop(input.history.at(-1)!.cropId!) : undefined; const candidates = P0.map((id) => getCrop(id)).filter((crop): crop is Crop => Boolean(crop && !excludedCropIds.includes(crop.id) && (crop.commercial || crop.purposes.includes('cover')) && crop.viableTempC)); return candidates.find((crop) => !last || crop.family !== last.family) ?? candidates[0]; }
export function evaluateConstraints(regionalContext: BrazilRegionalContext): Explanation[] { return regionalContext.zarc ? [] : [{ kind: 'limitation', message: regionalContext.country === 'BR' ? 'O município foi identificado, mas não há contexto ZARC P0 aplicável nesta safra; a exploração climática continua disponível.' : 'A coordenada não foi associada a município brasileiro; a exploração climática global continua disponível.', ruleId: 'GLOBAL_EXPLORATION', sourceRefs: regionalContext.municipalitySource ? [regionalContext.municipalitySource.url] : [], certainty: 'high', missingData: ['regional_source'] }]; }
export function generateCandidates(input: AnalysisInput, climate: ClimateContext = EMPTY_CLIMATE, labPlan?: LabPlan, regionalContext: BrazilRegionalContext = EMPTY_REGIONAL_CONTEXT): Rotation[] {
  const confirmed = Boolean(input.futureBaseline?.confirmed); const baseline = baselineCrop(input); const cover = selectCover(input); const excluded = [cover?.id, baseline?.id].flatMap((id) => id ? [id] : []); const resilience = selectResilience(input, excluded);
  const defaults = [strategy('A', confirmed ? 'Plano do produtor' : 'Continuidade presumida — confirmar', baseline, input, climate, regionalContext, true, !confirmed), strategy('B', 'Saúde do solo', cover, input, climate, regionalContext), strategy('C', 'Resiliência hídrica', resilience, input, climate, regionalContext, false, false, resilience ? undefined : 'Não há outra cultura P0 distinta com requisito térmico documentado para esta comparação.')];
  if (!labPlan) return defaults;
  return defaults.map((item) => { const configured = labPlan.scenarios.find((scenario) => scenario.id === item.id); if (!configured) return item; const cropId = labPrimaryCrop(labPlan, item.id); const crop = cropId ? getCrop(cropId) : undefined; const selected = strategy(item.id, configured.title, crop, input, climate, regionalContext, item.baseline, item.baselineAssumed, crop ? undefined : 'Nenhuma cultura foi escolhida nos slots do laboratório.'); return { ...selected, missingData: [...new Set([...selected.missingData, 'unconfigured_lab_slots'])] }; });
}
export function computeMetrics(candidate: Rotation): Rotation { return candidate; }
export function rankCandidates(candidates: Rotation[]): Rotation[] { return candidates; }
export function explain(candidate: Rotation): Explanation[] { return candidate.explanations; }
export function analyze(input: unknown, climate: ClimateContext = EMPTY_CLIMATE, labPlan?: LabPlan, regionalContext: BrazilRegionalContext = EMPTY_REGIONAL_CONTEXT): AnalysisResult {
  const parsed = validateInputs(input); if (!parsed.success) throw new Error(parsed.error.issues.map((issue) => issue.message).join('; '));
  const priorityHighlights = (Object.entries(parsed.data.priorities) as Array<[keyof AnalysisInput['priorities'], number]>).sort((a, b) => b[1] - a[1]).map(([key]) => key === 'water' ? 'historical_precipitation' : key === 'soil' ? 'cover_potential' : 'functional_diversity');
  return { strategies: generateCandidates(parsed.data, climate, labPlan, regionalContext), climate, regionalContext, warnings: [...evaluateConstraints(regionalContext).map((item) => item.message), ...regionalContext.gaps, ...climate.gaps], input: parsed.data, regionalContextAvailable: Boolean(regionalContext.zarc), disclaimer: 'Cenários exploratórios; não são recomendação agronômica, validação local, previsão ou prescrição.', priorityHighlights };
}
