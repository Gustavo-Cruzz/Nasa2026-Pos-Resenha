import type { AnalysisResult } from '@/lib/engine/types';
import type { Locale } from '@/lib/i18n';
import { cropDisplayName } from '@/lib/presentation';
import { deriveDecisionHero } from '@/lib/engine/decision-hero';
import { buildSourceHealth, sourceGapLabel, sourceStateLabel, sourceTitle } from '@/lib/source-health';

const monthNames = { 'pt-BR': ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'], en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] } as const;

function boundaryText(data: AnalysisResult, en: boolean): string {
  const boundary = data.boundaryAnalysis;
  if (boundary.status !== 'spatial_context') return 'N/D';
  const center = boundary.centroid ? `${en ? 'centroid' : 'centroide'} ${boundary.centroid.latitude.toFixed(5)}, ${boundary.centroid.longitude.toFixed(5)}` : null;
  const smap = boundary.smapHistorical.spatialInterpretation === 'coarser_than_boundary' ? (en ? 'smaller than one nominal 9 km SMAP cell' : 'menor que uma célula nominal de 9 km do SMAP') : en ? 'may span several nominal 9 km SMAP cells' : 'pode abranger várias células nominais de 9 km do SMAP';
  return [`${boundary.vertexCount} ${en ? 'vertices' : 'vértices'}`, `${boundary.areaHa ?? 'N/D'} ha`, center, smap, en ? 'SMAP historical series N/D (requires Earthdata preprocessing)' : 'série histórica SMAP N/D (requer pré-processamento Earthdata)'].filter(Boolean).join(' · ');
}

function waterLines(data: AnalysisResult, en: boolean): string[] {
  const point = data.input.waterPoint;
  if (!point) return [];
  const kind = { well: en ? 'well' : 'poço', river: en ? 'river' : 'rio', reservoir: en ? 'reservoir' : 'açude', other: en ? 'other' : 'outro' }[point.kind];
  return [`${en ? 'Water point declared by the producer' : 'Ponto de água informado pelo produtor'}: ${kind}${point.label ? ` — ${point.label}` : ''} (${en ? 'declared context only; not used in any reading' : 'apenas contexto declarado; não usado em nenhuma leitura'})`];
}

function decisionLines(data: AnalysisResult, locale: Locale): string[] {
  const en = locale === 'en';
  const hero = deriveDecisionHero(data);
  const month = monthNames[locale][hero.month - 1];
  const state = { attention: en ? 'attention' : 'atenção', compatible: en ? 'compatible' : 'compatível', unknown: 'N/D' }[hero.state];
  const rule = en ? 'NASA POWER median temperature vs. documented crop thermal range' : 'Temperatura mediana NASA POWER × faixa térmica documentada da cultura';
  const next = { confirm_baseline: en ? 'Confirm the baseline, then review the documented range with a local agronomist or technician.' : 'Confirme a linha de base e revise a faixa documentada com agrônomo ou técnico local.', review_with_technician: en ? 'Review the documented range with a local agronomist or technician.' : 'Revise a faixa documentada com agrônomo ou técnico local.', provide_data: en ? 'Provide the missing data or retry later; nothing was assumed to be fine.' : 'Informe o dado que falta ou tente depois; nada foi assumido como ok.' }[hero.nextCheck];
  const lines = ['', `## ${en ? 'Concrete decision' : 'Decisão concreta'}`, '', `- ${en ? 'State' : 'Estado'}: ${state}`, `- ${en ? 'Month' : 'Mês'}: ${month}`, `- ${en ? 'NASA signal' : 'Sinal NASA'}: ${hero.observedValue === null ? 'N/D' : `${hero.observedValue} ${hero.unit}`}${hero.period ? ` (${hero.period.start}–${hero.period.end})` : ''}`, `- ${en ? 'Rule' : 'Regra'}: ${rule}`, `- ${en ? 'Source' : 'Fonte'}: ${hero.sourceUrl ?? 'N/D'}`];
  for (const item of hero.items) lines.push(`- ${en ? 'Hypothesis' : 'Hipótese'} ${item.scenarioId} (${cropDisplayName(item.cropId, item.cropName, locale) || 'N/D'}): ${item.rangeC ? `${en ? 'documented range' : 'faixa documentada'} ${item.rangeC.min}–${item.rangeC.max} °C` : en ? 'no documented range (N/D)' : 'sem faixa documentada (N/D)'}`);
  if (hero.state !== 'unknown' && hero.unreadScenarioIds.length) lines.push(`- ${en ? 'No reading (not counted as compatible)' : 'Sem leitura (não conta como compatível)'}: ${hero.unreadScenarioIds.join(', ')}`);
  lines.push(`- ${en ? 'Next human check' : 'Próxima verificação humana'}: ${next}`);
  return lines;
}

function sourceLines(data: AnalysisResult, locale: Locale): string[] {
  const en = locale === 'en';
  const lines = ['', `## ${en ? 'Source status' : 'Estado das fontes'}`, ''];
  for (const source of buildSourceHealth(data)) {
    const parts = [sourceStateLabel(source.state, locale), source.origin, source.period, source.coveragePct === null ? null : `${source.coveragePct}%`, source.cache === 'verified_fixture' ? (en ? 'verified cache' : 'cache verificado') : null, sourceGapLabel(source.gap, locale) ? `${en ? 'gap' : 'lacuna'}: ${sourceGapLabel(source.gap, locale)}` : null].filter(Boolean);
    lines.push(`- ${sourceTitle(source.id)}: ${parts.join(' · ')}`);
  }
  return lines;
}

export function buildAnalysisSummary(data: AnalysisResult, locale: Locale): string {
  const en = locale === 'en';
  const evidenceLevel = (level: string) => ({ climate_exploration: en ? 'Climate exploration' : 'Exploração climática', regionally_contextualized: en ? 'Regional context' : 'Contexto regional', locally_validated: en ? 'Traceable local validation' : 'Validação local rastreável' }[level] ?? level);
  const lines = [`# Field Shift — ${en ? 'Exploratory comparison' : 'Comparação exploratória'}`, '', `${en ? 'Location' : 'Local'}: ${data.input.location.latitude}, ${data.input.location.longitude}`, `${en ? 'Exploratory boundary' : 'Polígono exploratório'}: ${boundaryText(data, en)}`, ...waterLines(data, en), `${en ? 'Planting-month climate window' : 'Mês da janela climática'}: ${data.input.plantingMonth}`, `${en ? 'Climate source' : 'Fonte climática'}: ${data.climate.provenance?.source ?? 'N/D'} (${data.climate.provenance?.period.start ?? 'N/D'}–${data.climate.provenance?.period.end ?? 'N/D'})`, ...decisionLines(data, locale), ...sourceLines(data, locale), '', `## ${en ? 'Scenarios' : 'Cenários'}`];
  for (const strategy of data.strategies) {
    lines.push('', `### ${strategy.id}. ${strategy.title}`, `${en ? 'Primary hypothesis' : 'Hipótese principal'}: ${strategy.proposedCrop?.name ?? 'N/D'}`, `${en ? 'Evidence level' : 'Nível de evidência'}: ${evidenceLevel(strategy.validationLevel)}`);
    for (const indicator of strategy.indicators) lines.push(`- ${indicator.label}: ${indicator.state} — ${indicator.detail}`);
    if (strategy.missingData.length) lines.push(`- ${en ? 'Missing' : 'Falta'}: ${strategy.missingData.join(', ')}`);
  }
  lines.push('', `## ${en ? 'Limits' : 'Limites'}`, ...data.evidenceManifest.guardrails.map((item) => `- ${item}`), '', data.disclaimer);
  return lines.join('\n');
}
