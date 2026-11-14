'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, CircleHelp, ClipboardCheck } from 'lucide-react';
import { loadDraft } from '@/lib/storage';
import { loadLastAnalysis, saveLastAnalysis } from '@/lib/analysis-cache';
import type { AnalysisResult, ValidationLevel } from '@/lib/engine/types';
import { Button } from '@/components/ui/button';
import { ClimatePanel } from '@/components/results/climate-panel';
import { ScenarioComparisonTable } from '@/components/results/scenario-comparison-table';
import { BrazilContextNote } from '@/components/brazil-context-note';
import { CropSprite } from '@/components/crops/crop-sprite';
import { DemoCharacter } from '@/components/pixel/demo-character';
import { PixelAnimation } from '@/components/pixel/pixel-animation';
import { ReviewTransition } from '@/components/pixel/review-transition';
import { ReviewObjects } from '@/components/pixel/review-objects';
import { BoundarySummary, waterKindLabel } from '@/components/boundary/boundary-summary';
import { TerrainPanel } from '@/components/results/terrain-panel';
import { SeasonPanel } from '@/components/results/season-panel';
import { SoilObservationNote } from '@/components/results/soil-observation-note';
import { DecisionHero } from '@/components/results/decision-hero';
import { NasaInsightPanel } from '@/components/results/nasa-insight-panel';
import { EvidenceCenterTrigger } from '@/components/evidence/evidence-center';
import { ExportSummaryButton } from '@/components/results/export-summary-button';
import { useLocale } from '@/components/locale-provider';
import { recordJourneyCompletion } from '@/lib/journey-metrics';
import { cropDisplayName, explanationDisplay, scenarioDisplayTitle } from '@/lib/presentation';

type State = { kind: 'loading' } | { kind: 'empty' } | { kind: 'error'; message: string } | { kind: 'ready'; data: AnalysisResult; cachedAt?: string };
const validationLabel: Record<ValidationLevel, string> = { climate_exploration: 'Exploração climática', regionally_contextualized: 'Contexto regional disponível', locally_validated: 'Validação local rastreável' };
const priorityLabel: Record<string, string> = { root_zone_wetness: 'contexto hídrico da zona radicular', cover_potential: 'potencial de cobertura', functional_diversity: 'diversidade funcional' };
const missingLabel: Record<string, string> = { cycle_duration: 'duração documentada', eligible_crop: 'cultura com critérios mínimos', historical_climate: 'clima histórico', documented_temperature_range: 'faixa térmica documentada', soil_ph_or_verified_range: 'pH informado ou faixa verificável', unconfigured_lab_slots: 'slots ainda não configurados', futureBaseline: 'plano futuro confirmado' };
const stateText: Record<string, string> = { compatible: 'compatível', attention: 'atenção', unknown: 'desconhecido', yes: 'presente', no: 'não catalogado', observed: 'observado' };

export function AnalysisResults({ demo = false }: { demo?: boolean }) {
  const { locale } = useLocale();
  const en = locale === 'en';
  const [state, setState] = useState<State>({ kind: 'loading' });
  useEffect(() => {
    const draft = loadDraft();
    if (!draft) { void Promise.resolve().then(() => setState({ kind: 'empty' })); return; }
    void fetch('/api/analyze', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ input: draft.data, ...(draft.labPlan ? { labPlan: draft.labPlan } : {}) }) })
      .then(async (response) => { const body: unknown = await response.json(); if (!response.ok) throw new Error(typeof body === 'object' && body && 'message' in body ? String(body.message) : 'Não foi possível analisar o rascunho.'); const result = body as AnalysisResult; saveLastAnalysis(result); setState({ kind: 'ready', data: result }); })
      .catch((error: unknown) => { const cached = loadLastAnalysis(); if (cached) setState({ kind: 'ready', data: cached.data, cachedAt: cached.savedAt }); else setState({ kind: 'error', message: error instanceof Error ? error.message : 'Não foi possível analisar o rascunho.' }); });
  }, []);
  useEffect(() => { if (state.kind === 'ready') recordJourneyCompletion(); }, [state.kind]);
  if (state.kind === 'loading') return <p role="status" className="mt-6 flex items-center gap-3 text-slate-300"><PixelAnimation fallback="/assets/interactions/analysis-loading-static.png" frames={8} loop sheet="/assets/interactions/analysis-loading-sheet.png" />{en ? 'Analyzing climate and scenarios…' : 'Analisando clima e cenários…'}</p>;
  if (state.kind === 'empty') return <Empty message={en ? 'No valid draft was found in this browser.' : 'Nenhum rascunho válido foi encontrado neste navegador.'} />;
  if (state.kind === 'error') return <Empty message={state.message} />;
  const { data } = state;
  const validationLabels: Record<ValidationLevel, string> = en ? { climate_exploration: 'Climate exploration', regionally_contextualized: 'Regional context available', locally_validated: 'Traceable local validation' } : validationLabel;
  const priorityLabels: Record<string, string> = en ? { root_zone_wetness: 'root-zone water context', cover_potential: 'cover potential', functional_diversity: 'functional diversity' } : priorityLabel;
  const missingLabels: Record<string, string> = en ? { cycle_duration: 'documented duration', eligible_crop: 'crop meeting minimum criteria', historical_climate: 'historical climate', documented_temperature_range: 'documented thermal range', soil_ph_or_verified_range: 'informed pH or verifiable range', unconfigured_lab_slots: 'unconfigured slots', futureBaseline: 'confirmed future plan' } : missingLabel;
  const states: Record<string, string> = en ? { compatible: 'compatible', attention: 'attention', unknown: 'unknown', yes: 'present', no: 'not cataloged', observed: 'observed' } : stateText;
  return <>
    <ReviewTransition />
    {demo ? <aside className="mt-5 rounded-xl border border-lime-300 bg-lime-300/10 p-4"><p className="font-bold text-lime-200">{en ? 'Brazil demonstration' : 'Demonstração Brasil'}</p><p className="mt-1 text-sm text-slate-200">Rio Verde · NASA POWER + {en ? 'municipal ZARC context' : 'contexto ZARC municipal'}.</p></aside> : null}
    {state.cachedAt ? <p className="mt-5 rounded-xl border border-amber-300 bg-amber-950/40 p-4 text-sm" role="status"><b>{en ? 'Offline or NASA unreachable.' : 'Sem rede ou NASA inacessível.'}</b> {en ? `Showing the last analysis saved on this device (${new Date(state.cachedAt).toLocaleString('en-US')}). It may not reflect later edits or newer data.` : `Mostrando a última análise salva neste dispositivo (${new Date(state.cachedAt).toLocaleString('pt-BR')}). Ela pode não refletir edições posteriores nem dados mais novos.`}</p> : null}
    <DecisionHero data={data} />
    <div className="mt-5 flex flex-wrap gap-3"><Button asChild variant="secondary"><Link href="/lab">{en ? 'Back to laboratory' : 'Voltar ao laboratório'}</Link></Button><Button asChild variant="secondary"><Link href="/farm">{en ? 'Edit farm data' : 'Alterar dados da fazenda'}</Link></Button><ExportSummaryButton data={data} /></div>
    {data.input.soilObservation ? <SoilObservationNote observation={data.input.soilObservation} /> : null}
    <div className="mt-5"><BrazilContextNote context={data.regionalContext} /></div>
    {data.evidenceManifest ? <div className="mt-4"><EvidenceCenterTrigger manifest={data.evidenceManifest} /></div> : null}
    {data.input.fieldBoundary ? <div className="mt-5"><h2 className="mb-2 font-bold">{en ? 'Boundary in the analysis' : 'Polígono na análise'}</h2><BoundarySummary boundary={data.input.fieldBoundary} waterPoint={data.input.waterPoint} /></div> : data.input.waterPoint ? <p className="mt-5 text-sm text-slate-300"><b>{en ? 'Water point declared by the producer' : 'Ponto de água informado pelo produtor'}:</b> {waterKindLabel(data.input.waterPoint.kind, en)}{data.input.waterPoint.label ? ` — ${data.input.waterPoint.label}` : ''}. {en ? 'Declared context only.' : 'Apenas contexto declarado.'}</p> : null}
    <SeasonPanel data={data} />
    <TerrainPanel data={data} />
    <NasaInsightPanel initialMonth={data.input.plantingMonth} insights={data.nasaInsightByMonth} />
    <p className="mt-4 text-sm text-slate-300"><b>{en ? 'Highlighted priorities' : 'Prioridades em destaque'}:</b> {data.priorityHighlights.map((id) => priorityLabels[id] ?? id).join(', ')}.</p>
    <ScenarioComparisonTable data={data} />
    <DecisionSummary data={data} />
    <section className="mt-6 grid gap-4 lg:grid-cols-3" aria-label="Estratégias exploratórias">{data.strategies.map((strategy) => {
      const cropName = cropDisplayName(strategy.proposedCrop?.cropId, strategy.proposedCrop?.name, locale);
      return <article className="rounded-xl border border-slate-700 bg-slate-900 p-5" key={strategy.id}><p className="text-sm font-semibold text-lime-300">{en ? 'Scenario' : 'Cenário'} {strategy.id} · {validationLabels[strategy.validationLevel]}</p><h2 className="mt-1 text-xl font-bold">{scenarioDisplayTitle(strategy, locale)}</h2>{strategy.baselineAssumed ? <p className="mt-3 rounded bg-amber-950/60 p-3 text-sm text-amber-100">{en ? 'Assumed continuation — confirm it.' : 'Continuação presumida — confirmar.'}</p> : null}{strategy.baseline ? <Link className="mt-3 inline-block text-sm underline" href="/farm?edit=baseline">{en ? 'Edit baseline' : 'Editar linha de base'}</Link> : null}{strategy.proposedCrop ? <div className="mt-4 flex items-center gap-3 rounded-lg bg-slate-800/60 p-3"><CropSprite cropId={strategy.proposedCrop.cropId} name={cropName} size={52} /><div className="text-sm"><p><b>{en ? 'Main hypothesis' : 'Hipótese principal'}:</b> {cropName}</p><p>{en ? 'Planting month' : 'Plantio: mês'} {strategy.proposedCrop.plantingMonth}; {en ? 'duration: not documented.' : 'duração: não documentada.'}</p></div></div> : <p className="mt-4 text-sm text-amber-100">{en ? 'No proposed crop: minimum evidence criteria were not met.' : 'Cultura proposta indisponível: critério mínimo sem evidência.'}</p>}{strategy.slots?.length ? <section className="mt-4" aria-label={en ? `Scenario ${strategy.id} sequence` : `Sequência do cenário ${strategy.id}`}><h3 className="text-sm font-bold">{en ? 'Experimental sequence' : 'Sequência experimental'} · {strategy.configuredSlots}/4 slots</h3><div className="mt-2 grid grid-cols-2 gap-2">{strategy.slots.map((slot) => { const diversity = slot.indicators.find((indicator) => indicator.id === 'functional_diversity'); return <div className="rounded-lg border border-slate-700 p-2 text-xs" key={`${slot.year}-${slot.season}`}><span className="text-slate-400">{en ? 'Year' : 'Ano'} {slot.year} · {slot.season}</span><b className="mt-1 block">{cropDisplayName(slot.cropId, slot.cropName, locale)}</b><span className="mt-1 block text-slate-300">{en ? 'Diversity' : 'Diversidade'}: {diversity ? states[diversity.state] : 'N/D'}</span></div>; })}</div></section> : null}<details className="mt-4"><summary className="cursor-pointer font-semibold">{en ? 'Why this scenario?' : 'Por que este cenário?'}</summary>{strategy.explanations.length ? strategy.explanations.map((item) => <div className="mt-3 border-l-2 border-slate-600 pl-3 text-sm" key={item.ruleId}><p>{explanationDisplay(item, locale)}</p></div>) : <p className="mt-2 text-sm text-slate-300">{en ? 'No additional explanation beyond indicators and gaps.' : 'Sem explicação adicional além dos indicadores e lacunas.'}</p>}{strategy.missingData.length ? <p className="mt-4 text-xs text-slate-300"><b>{en ? 'Missing' : 'Falta'}:</b> {strategy.missingData.map((item) => missingLabels[item] ?? (en ? 'additional evidence' : 'evidência adicional')).join(', ')}.</p> : null}</details></article>;
    })}</section>
    <details className="mt-6 rounded-xl border border-slate-700 bg-slate-900 p-5"><summary className="cursor-pointer font-bold">{en ? 'Climate and regional technical details' : 'Detalhes técnicos de clima e contexto regional'}</summary><RegionalContextDetails data={data} /><ClimatePanel climate={data.climate} plantingMonth={data.input.plantingMonth} /></details>
  </>;
}

function RegionalContextDetails({ data }: { data: AnalysisResult }) {
  const { locale } = useLocale();
  const en = locale === 'en';
  const context = data.regionalContext;
  if (!context.municipality) return null;
  const crops = Object.values(context.zarc?.crops ?? {});
  return <details className="mt-3 rounded-lg border border-slate-700 p-4"><summary className="cursor-pointer font-semibold">{en ? 'Municipality and ZARC coverage' : 'Município e cobertura ZARC'}</summary><div className="mt-3 text-sm text-slate-300"><p><b>{en ? 'Municipality' : 'Município'}:</b> {context.municipality.name} ({context.municipality.uf}) · {en ? 'IBGE code' : 'código IBGE'} {context.municipality.code}</p>{context.zarc ? <><p className="mt-2"><b>{en ? 'Crop year' : 'Safra'}:</b> {context.zarc.safra} · {crops.length} {en ? 'P0 crops with aggregated records' : 'culturas P0 com registros agregados'}.</p><ul className="mt-3 grid gap-2 sm:grid-cols-2">{crops.map((crop) => <li className="rounded bg-slate-800/60 p-3" key={crop.cropId}><b>{crop.zarcCultures.join(' / ')}</b><span className="mt-1 block">{crop.rowCount} {en ? 'source rows' : 'linhas-fonte'} · {en ? 'cycles' : 'ciclos'} {crop.cycleCodes.join(', ') || 'N/D'} · {en ? 'soils' : 'solos'} {crop.soilCodes.join(', ') || 'N/D'}</span><span className="mt-1 block">{en ? 'Raw codes found' : 'Códigos brutos encontrados'}: {crop.riskCodes.join(', ') || 'N/D'} — {en ? 'not interpreted as percentages by the application' : 'não interpretados como percentuais pelo aplicativo'}.</span></li>)}</ul><div className="mt-3 flex flex-wrap gap-3"><a className="underline" href={context.zarc.sourceUrl} rel="noreferrer" target="_blank">{en ? 'Open ZARC table' : 'Abrir Tábua ZARC'}</a><a className="underline" href={context.zarc.dictionaryUrl} rel="noreferrer" target="_blank">{en ? 'Open dictionary' : 'Abrir dicionário'}</a></div></> : <p className="mt-2">{en ? 'No P0 record in the loaded ZARC package for this municipality.' : 'Sem registro P0 no pacote ZARC carregado para este município.'}</p>}</div></details>;
}

function DecisionSummary({ data }: { data: AnalysisResult }) {
  const { locale } = useLocale();
  const en = locale === 'en';
  const labels: Record<string, string> = en ? { cycle_duration: 'documented duration', eligible_crop: 'eligible crop', historical_climate: 'historical climate', documented_temperature_range: 'documented thermal range', soil_ph_or_verified_range: 'informed pH or verifiable range', unconfigured_lab_slots: 'unconfigured slots', futureBaseline: 'confirmed future plan' } : missingLabel;
  const missing = [...new Set(data.strategies.flatMap((strategy) => strategy.missingData).map((item) => labels[item] ?? (en ? 'additional evidence' : 'evidência adicional')))];
  const assumed = data.strategies.some((strategy) => strategy.baselineAssumed);
  return <section className="mt-6 rounded-xl border border-lime-300/50 bg-slate-900 p-5" aria-labelledby="decision-heading"><div className="flex items-center gap-3"><DemoCharacter animated pose="talk" role="technician" /><div><h2 className="text-xl font-bold" id="decision-heading">{en ? 'Take this conversation forward' : 'Leve esta conversa adiante'}</h2><p className="text-sm text-slate-300">{en ? 'Fictional character; human review is not automatic validation.' : 'Personagem fictícia; a revisão humana não é validação automática.'}</p></div></div><div className="mt-4 grid gap-4 md:grid-cols-3"><div><CheckCircle2 className="text-lime-300" aria-hidden="true" /><h3 className="mt-2 font-bold">{en ? 'What we know' : 'O que sabemos'}</h3><p className="mt-1 text-sm text-slate-300">{en ? `Historical climate is ${data.climate.status === 'available' ? 'available' : 'unavailable'}, and three hypotheses use the same window.` : `Há clima histórico ${data.climate.status === 'available' ? 'disponível' : 'indisponível'} e três hipóteses comparadas sob a mesma janela.`}</p></div><div><CircleHelp className="text-amber-300" aria-hidden="true" /><h3 className="mt-2 font-bold">{en ? 'What is missing' : 'O que falta'}</h3><p className="mt-1 text-sm text-slate-300">{missing.length ? missing.join(', ') : en ? 'No critical cataloged gap.' : 'Nenhuma lacuna crítica catalogada.'}</p></div><div><ClipboardCheck className="text-cyan-300" aria-hidden="true" /><h3 className="mt-2 font-bold">{en ? 'Next step' : 'Próximo passo'}</h3><p className="mt-1 text-sm text-slate-300">{assumed ? en ? 'Confirm the baseline and review gaps with technical assistance.' : 'Confirme a linha de base e revise as lacunas com assistência técnica.' : en ? 'Take the hypotheses and sources to a local agronomist or technician.' : 'Leve as hipóteses e fontes para revisão com um agrônomo ou técnico local.'}</p></div></div><ReviewObjects /></section>;
}

function Empty({ message }: { message: string }) { const { locale } = useLocale(); return <section className="mt-6 rounded-xl border border-slate-700 p-5"><p>{message}</p><Button asChild className="mt-5"><Link href="/explore">{locale === 'en' ? 'Start analysis' : 'Preencher análise'}</Link></Button></section>; }
