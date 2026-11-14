import type { ClimateContext } from '@/lib/climate/nasa-power';
import type { EvidenceClaim, EvidenceGap, EvidenceManifest, EvidenceSource } from '@/lib/evidence/types';
import type { Rotation, ValidationLevel } from '@/lib/engine/types';
import type { BrazilRegionalContext } from '@/lib/brazil/types';
import type { BoundaryAnalysis } from '@/lib/engine/boundary-context';

const gapLabels: Record<string, string> = { cycle_duration: 'Duração documentada', eligible_crop: 'Cultura com critérios mínimos', historical_climate: 'Clima histórico', documented_temperature_range: 'Faixa térmica documentada', soil_ph_or_verified_range: 'pH informado ou faixa verificável', unconfigured_lab_slots: 'Slots ainda não configurados', crop: 'Cultura do slot', temperature: 'Faixa térmica', cycle: 'Duração documentada', soil_ph: 'Contexto de pH', previous_crop_family: 'Família da cultura anterior' };

function claimStatus(state: string): EvidenceClaim['status'] { return state === 'unknown' ? 'missing' : state === 'attention' || state === 'no' ? 'partial' : 'supported'; }

export function buildEvidenceManifest(strategies: Rotation[], climate: ClimateContext, regionalContext: BrazilRegionalContext, boundary?: BoundaryAnalysis): EvidenceManifest {
  const sources: EvidenceSource[] = [{ id: 'farmer-input', kind: 'farmer', title: 'Dados informados pelo produtor', status: 'available', scope: 'user_supplied', url: null, period: null, coveragePct: null }];
  const sourceByUrl = new Map<string, string>();
  if (climate.provenance) {
    sources.push({ id: 'nasa-power', kind: 'nasa', title: climate.provenance.rawParameterNames.includes('IMERG_PRECTOT') ? 'NASA POWER · MERRA-2 + GPM IMERG' : 'NASA POWER Daily Point', status: climate.status === 'available' ? 'available' : 'unavailable', scope: 'global', url: climate.provenance.sourceUrl, period: `${climate.provenance.period.start}–${climate.provenance.period.end}`, coveragePct: climate.provenance.coveragePct.T2M });
    sourceByUrl.set(climate.provenance.sourceUrl, 'nasa-power');
  } else sources.push({ id: 'nasa-power', kind: 'nasa', title: 'NASA POWER Daily Point', status: 'unavailable', scope: 'global', url: null, period: null, coveragePct: null });
  if (boundary?.status === 'spatial_context') sources.push({ id: 'nasa-smap-history', kind: 'nasa', title: 'NASA SMAP L4 SPL4SMGP v8', status: 'partial', scope: 'global', url: boundary.smapHistorical.sourceUrl, period: boundary.smapHistorical.temporalCoverage, coveragePct: null });
  if (regionalContext.zarc) {
    sources.push({ id: 'regional-zarc', kind: 'regional', title: `ZARC ${regionalContext.zarc.safra}`, status: 'available', scope: 'municipal', url: regionalContext.zarc.sourceUrl, period: regionalContext.zarc.safra, coveragePct: null });
    sourceByUrl.set(regionalContext.zarc.sourceUrl, 'regional-zarc');
  } else if (regionalContext.municipalitySource) {
    sources.push({ id: 'regional-ibge', kind: 'regional', title: 'Malha municipal IBGE', status: 'partial', scope: 'municipal', url: regionalContext.municipalitySource.url, period: regionalContext.municipalitySource.version, coveragePct: null });
    sourceByUrl.set(regionalContext.municipalitySource.url, 'regional-ibge');
  }
  const allRefs = [...new Set(strategies.flatMap((strategy) => [...strategy.indicators.flatMap((indicator) => indicator.sourceRefs), ...strategy.slots.flatMap((slot) => slot.sourceRefs), ...strategy.explanations.flatMap((item) => item.sourceRefs)]))];
  for (const url of allRefs) {
    if (sourceByUrl.has(url)) continue;
    const id = `catalog-${sources.filter((source) => source.kind === 'catalog').length + 1}`;
    sources.push({ id, kind: 'catalog', title: 'Fonte agrícola documentada', status: 'partial', scope: 'global', url: url.startsWith('http') ? url : null, period: null, coveragePct: null });
    sourceByUrl.set(url, id);
  }
  const sourceIds = (refs: string[], indicatorId: string) => [...new Set([
    ...refs.flatMap((ref) => sourceByUrl.get(ref) ? [sourceByUrl.get(ref)!] : []),
    ...(['functional_diversity', 'soil_context'].includes(indicatorId) ? ['farmer-input'] : []),
    ...(['thermal_compatibility', 'historical_precipitation', 'rainfall_distribution', 'root_zone_wetness', 'documented_water_response'].includes(indicatorId) ? ['nasa-power'] : []),
  ])];
  const claims: EvidenceClaim[] = strategies.flatMap((strategy) => {
    const summary = strategy.indicators.map((indicator) => ({ id: `${strategy.id}-summary-${indicator.id}`, scenarioId: strategy.id, slotIndex: null, indicatorId: indicator.id, label: `${indicator.label} — cenário ${strategy.id}`, observation: indicator.detail, ruleId: `SUMMARY_${indicator.id.toUpperCase()}`, result: indicator.state, status: claimStatus(indicator.state), validationLevel: strategy.validationLevel, sourceIds: sourceIds(indicator.sourceRefs, indicator.id), missingData: indicator.state === 'unknown' ? [indicator.id] : [] }));
    const slots = strategy.slots.flatMap((slot) => slot.indicators.map((indicator) => ({ id: `${strategy.id}-slot-${slot.slotIndex}-${indicator.id}`, scenarioId: strategy.id, slotIndex: slot.slotIndex, indicatorId: indicator.id, label: `${indicator.label} — cenário ${strategy.id}, slot ${slot.slotIndex + 1}`, observation: indicator.detail, ruleId: `SLOT_${indicator.id.toUpperCase()}`, result: indicator.state, status: claimStatus(indicator.state), validationLevel: slot.validationLevel, sourceIds: sourceIds(indicator.sourceRefs, indicator.id), missingData: indicator.state === 'unknown' ? slot.missingEvidence : [] })));
    return [...summary, ...slots];
  });
  const gapsById = new Map<string, EvidenceGap>();
  for (const strategy of strategies) for (const gap of [...strategy.missingData, ...strategy.slots.flatMap((slot) => slot.missingEvidence)]) {
    const existing = gapsById.get(gap);
    if (existing && !existing.scenarioIds.includes(strategy.id)) existing.scenarioIds.push(strategy.id);
    else if (!existing) gapsById.set(gap, { id: gap, label: gapLabels[gap] ?? gap, scenarioIds: [strategy.id] });
  }
  if (boundary?.status === 'spatial_context') gapsById.set('smap_numeric_polygon_history', { id: 'smap_numeric_polygon_history', label: 'Série histórica SMAP numérica agregada ao polígono', scenarioIds: [] });
  return { sources, claims, gaps: [...gapsById.values()], guardrails: ['Não é previsão meteorológica.', 'Precipitação observada não é demanda hídrica.', 'Contexto municipal não é validação do talhão.', 'Cenários exploratórios não são recomendação agronômica.'] };
}
