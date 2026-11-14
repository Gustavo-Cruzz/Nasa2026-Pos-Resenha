import type { AnalysisResult } from '@/lib/engine/types';
import type { Locale } from '@/lib/i18n';

export function buildAnalysisSummary(data: AnalysisResult, locale: Locale): string {
  const en = locale === 'en';
  const evidenceLevel = (level: string) => ({ climate_exploration: en ? 'Climate exploration' : 'Exploração climática', regionally_contextualized: en ? 'Regional context' : 'Contexto regional', locally_validated: en ? 'Traceable local validation' : 'Validação local rastreável' }[level] ?? level);
  const lines = [`# Field Shift — ${en ? 'Exploratory comparison' : 'Comparação exploratória'}`, '', `${en ? 'Location' : 'Local'}: ${data.input.location.latitude}, ${data.input.location.longitude}`, `${en ? 'Exploratory boundary' : 'Polígono exploratório'}: ${data.boundaryAnalysis.status === 'spatial_context' ? `${data.boundaryAnalysis.vertexCount} ${en ? 'vertices' : 'vértices'} · ${data.boundaryAnalysis.areaHa ?? 'N/D'} ha` : 'N/D'}`, `${en ? 'Planting-month climate window' : 'Mês da janela climática'}: ${data.input.plantingMonth}`, `${en ? 'Climate source' : 'Fonte climática'}: ${data.climate.provenance?.source ?? 'N/D'} (${data.climate.provenance?.period.start ?? 'N/D'}–${data.climate.provenance?.period.end ?? 'N/D'})`, '', `## ${en ? 'Scenarios' : 'Cenários'}`];
  if (data.nasaInsight.attentionDecision) lines.push('', `${en ? 'Concrete decision' : 'Decisão concreta'}: ${en ? 'month' : 'mês'} ${data.nasaInsight.month}, ${en ? 'scenario' : 'hipótese'} ${data.nasaInsight.attentionDecision.scenarioId} ${en ? 'needs attention because the NASA signal is' : 'fica sob atenção porque o sinal NASA é'} ${data.nasaInsight.attentionDecision.observedValue} °C (${en ? 'documented range' : 'faixa documentada'} ${data.nasaInsight.attentionDecision.documentedRangeC.min}–${data.nasaInsight.attentionDecision.documentedRangeC.max} °C).`);
  for (const strategy of data.strategies) {
    lines.push('', `### ${strategy.id}. ${strategy.title}`, `${en ? 'Primary hypothesis' : 'Hipótese principal'}: ${strategy.proposedCrop?.name ?? 'N/D'}`, `${en ? 'Evidence level' : 'Nível de evidência'}: ${evidenceLevel(strategy.validationLevel)}`);
    for (const indicator of strategy.indicators) lines.push(`- ${indicator.label}: ${indicator.state} — ${indicator.detail}`);
    if (strategy.missingData.length) lines.push(`- ${en ? 'Missing' : 'Falta'}: ${strategy.missingData.join(', ')}`);
  }
  lines.push('', `## ${en ? 'Limits' : 'Limites'}`, ...data.evidenceManifest.guardrails.map((item) => `- ${item}`), '', data.disclaimer);
  return lines.join('\n');
}
