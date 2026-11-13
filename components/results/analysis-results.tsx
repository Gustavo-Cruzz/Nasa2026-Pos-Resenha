'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, CircleHelp, ClipboardCheck } from 'lucide-react';
import { loadDraft } from '@/lib/storage';
import type { AnalysisResult, ValidationLevel } from '@/lib/engine/types';
import { Button } from '@/components/ui/button';
import { ClimatePanel } from '@/components/results/climate-panel';
import { SourcesDetails } from '@/components/results/sources-details';
import { ScenarioComparisonTable } from '@/components/results/scenario-comparison-table';
import { BrazilContextNote } from '@/components/brazil-context-note';
import { CropSprite } from '@/components/crops/crop-sprite';
import { DemoCharacter } from '@/components/pixel/demo-character';
import { PixelAnimation } from '@/components/pixel/pixel-animation';
import { ReviewTransition } from '@/components/pixel/review-transition';
import { ScenarioArtwork } from '@/components/pixel/scenario-artwork';
import { ReviewObjects } from '@/components/pixel/review-objects';

type State = { kind: 'loading' } | { kind: 'empty' } | { kind: 'error'; message: string } | { kind: 'ready'; data: AnalysisResult };
const validationLabel: Record<ValidationLevel, string> = { climate_exploration: 'Exploração climática', regionally_contextualized: 'Contexto regional disponível', locally_validated: 'Validação local rastreável' };
const priorityLabel: Record<string, string> = { historical_precipitation: 'precipitação histórica', cover_potential: 'potencial de cobertura', functional_diversity: 'diversidade funcional' };
const missingLabel: Record<string, string> = { cycle_duration: 'duração documentada', eligible_crop: 'cultura com critérios mínimos', historical_climate: 'clima histórico', documented_temperature_range: 'faixa térmica documentada', soil_ph_or_verified_range: 'pH informado ou faixa verificável', unconfigured_lab_slots: 'slots ainda não configurados', futureBaseline: 'plano futuro confirmado' };

export function AnalysisResults({ demo = false }: { demo?: boolean }) {
  const [state, setState] = useState<State>({ kind: 'loading' });
  useEffect(() => {
    const draft = loadDraft();
    if (!draft) { void Promise.resolve().then(() => setState({ kind: 'empty' })); return; }
    void fetch('/api/analyze', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ input: draft.data, ...(draft.labPlan ? { labPlan: draft.labPlan } : {}) }) })
      .then(async (response) => { const body: unknown = await response.json(); if (!response.ok) throw new Error(typeof body === 'object' && body && 'message' in body ? String(body.message) : 'Não foi possível analisar o rascunho.'); setState({ kind: 'ready', data: body as AnalysisResult }); })
      .catch((error: unknown) => setState({ kind: 'error', message: error instanceof Error ? error.message : 'Não foi possível analisar o rascunho.' }));
  }, []);
  if (state.kind === 'loading') return <p role="status" className="mt-6 flex items-center gap-3 text-slate-300"><PixelAnimation fallback="/assets/interactions/analysis-loading-static.png" frames={8} loop sheet="/assets/interactions/analysis-loading-sheet.png" />Analisando clima e cenários…</p>;
  if (state.kind === 'empty') return <Empty message="Nenhum rascunho válido foi encontrado neste navegador." />;
  if (state.kind === 'error') return <Empty message={state.message} />;
  const { data } = state;
  return <>
    <ReviewTransition />
    {demo ? <aside className="mt-5 rounded-xl border border-lime-300 bg-lime-300/10 p-4"><p className="font-bold text-lime-200">Demonstração Brasil</p><p className="mt-1 text-sm text-slate-200">Rio Verde · NASA POWER + contexto ZARC municipal.</p></aside> : null}
    <div className="mt-5 flex flex-wrap gap-3"><Button asChild variant="secondary"><Link href="/lab">Voltar ao laboratório</Link></Button><Button asChild variant="secondary"><Link href="/farm">Alterar prioridades</Link></Button></div>
    <div className="mt-5"><BrazilContextNote context={data.regionalContext} /></div>
    <RegionalContextDetails data={data} />
    <ClimatePanel climate={data.climate} plantingMonth={data.input.plantingMonth} />
    <SourcesDetails provenance={data.climate.provenance} sourceRefs={[]} title="Proveniência climática" />
    <p className="mt-4 text-sm text-slate-300"><b>Prioridades em destaque:</b> {data.priorityHighlights.map((id) => priorityLabel[id] ?? id).join(', ')}.</p>
    <ScenarioComparisonTable data={data} />
    <DecisionSummary data={data} />
    <section className="mt-6 grid gap-4 lg:grid-cols-3" aria-label="Estratégias exploratórias">{data.strategies.map((strategy) => {
      const sourceRefs = [...strategy.indicators.flatMap((indicator) => indicator.sourceRefs), ...strategy.explanations.flatMap((item) => item.sourceRefs)];
      return <article className="rounded-xl border border-slate-700 bg-slate-900 p-5" key={strategy.id}><p className="text-sm font-semibold text-lime-300">Cenário {strategy.id} · {validationLabel[strategy.validationLevel]}</p><h2 className="mt-1 text-xl font-bold">{strategy.title}</h2><div className="mt-3"><ScenarioArtwork empty={!strategy.proposedCrop} scenario={strategy.id} /></div>{strategy.baselineAssumed ? <p className="mt-3 rounded bg-amber-950/60 p-3 text-sm text-amber-100">Continuação presumida — confirmar.</p> : null}{strategy.baseline ? <Link className="mt-3 inline-block text-sm underline" href="/farm?edit=baseline">Editar linha de base</Link> : null}{strategy.proposedCrop ? <div className="mt-4 flex items-center gap-3 rounded-lg bg-slate-800/60 p-3"><CropSprite cropId={strategy.proposedCrop.cropId} name={strategy.proposedCrop.name} size={52} /><div className="text-sm"><p><b>Hipótese:</b> {strategy.proposedCrop.name}</p><p>Plantio: mês {strategy.proposedCrop.plantingMonth}; duração: não documentada.</p></div></div> : <p className="mt-4 text-sm text-amber-100">Cultura proposta indisponível: critério mínimo sem evidência.</p>}<details className="mt-4"><summary className="cursor-pointer font-semibold">Por que este cenário?</summary>{strategy.explanations.length ? strategy.explanations.map((item) => <div className="mt-3 border-l-2 border-slate-600 pl-3 text-sm" key={item.ruleId}><p>{item.message}</p><p className="mt-1 text-xs text-slate-300">Evidência: {item.certainty === 'high' ? 'regra rastreável' : item.certainty === 'medium' ? 'parcial' : 'baixa; requer confirmação'}.</p></div>) : <p className="mt-2 text-sm text-slate-300">Sem explicação adicional além dos indicadores e lacunas.</p>}</details><SourcesDetails sourceRefs={sourceRefs} title="Fontes do cenário" />{strategy.missingData.length ? <p className="mt-4 text-xs text-slate-300"><b>Falta:</b> {strategy.missingData.map((item) => missingLabel[item] ?? 'evidência adicional').join(', ')}.</p> : null}</article>;
    })}</section>
  </>;
}

function RegionalContextDetails({ data }: { data: AnalysisResult }) {
  const context = data.regionalContext;
  if (!context.municipality) return null;
  const crops = Object.values(context.zarc?.crops ?? {});
  return <details className="mt-3 rounded-lg border border-slate-700 p-4"><summary className="cursor-pointer font-semibold">Município e cobertura ZARC</summary><div className="mt-3 text-sm text-slate-300"><p><b>Município:</b> {context.municipality.name} ({context.municipality.uf}) · código IBGE {context.municipality.code}</p>{context.zarc ? <><p className="mt-2"><b>Safra:</b> {context.zarc.safra} · {crops.length} culturas P0 com registros agregados.</p><ul className="mt-3 grid gap-2 sm:grid-cols-2">{crops.map((crop) => <li className="rounded bg-slate-800/60 p-3" key={crop.cropId}><b>{crop.zarcCultures.join(' / ')}</b><span className="mt-1 block">{crop.rowCount} linhas-fonte · ciclos {crop.cycleCodes.join(', ') || 'N/D'} · solos {crop.soilCodes.join(', ') || 'N/D'}</span><span className="mt-1 block">Códigos brutos encontrados: {crop.riskCodes.join(', ') || 'N/D'} — não interpretados como percentuais pelo aplicativo.</span></li>)}</ul><div className="mt-3 flex flex-wrap gap-3"><a className="underline" href={context.zarc.sourceUrl} rel="noreferrer" target="_blank">Abrir Tábua ZARC</a><a className="underline" href={context.zarc.dictionaryUrl} rel="noreferrer" target="_blank">Abrir dicionário</a></div></> : <p className="mt-2">Sem registro P0 no pacote ZARC carregado para este município.</p>}</div></details>;
}

function DecisionSummary({ data }: { data: AnalysisResult }) {
  const missing = [...new Set(data.strategies.flatMap((strategy) => strategy.missingData).map((item) => missingLabel[item] ?? 'evidência adicional'))];
  const assumed = data.strategies.some((strategy) => strategy.baselineAssumed);
  return <section className="mt-6 rounded-xl border border-lime-300/50 bg-slate-900 p-5" aria-labelledby="decision-heading"><div className="flex items-center gap-3"><DemoCharacter animated pose="talk" role="technician" /><div><h2 className="text-xl font-bold" id="decision-heading">Leve esta conversa adiante</h2><p className="text-sm text-slate-300">Personagem fictícia; a revisão humana não é validação automática.</p></div></div><div className="mt-4 grid gap-4 md:grid-cols-3"><div><CheckCircle2 className="text-lime-300" aria-hidden="true" /><h3 className="mt-2 font-bold">O que sabemos</h3><p className="mt-1 text-sm text-slate-300">Há clima histórico {data.climate.status === 'available' ? 'disponível' : 'indisponível'} e três hipóteses comparadas sob a mesma janela.</p></div><div><CircleHelp className="text-amber-300" aria-hidden="true" /><h3 className="mt-2 font-bold">O que falta</h3><p className="mt-1 text-sm text-slate-300">{missing.length ? missing.join(', ') : 'Nenhuma lacuna crítica catalogada.'}</p></div><div><ClipboardCheck className="text-cyan-300" aria-hidden="true" /><h3 className="mt-2 font-bold">Próximo passo</h3><p className="mt-1 text-sm text-slate-300">{assumed ? 'Confirme a linha de base e revise as lacunas com assistência técnica.' : 'Leve as hipóteses e fontes para revisão com um agrônomo ou técnico local.'}</p></div></div><ReviewObjects /></section>;
}

function Empty({ message }: { message: string }) { return <section className="mt-6 rounded-xl border border-slate-700 p-5"><p>{message}</p><Button asChild className="mt-5"><Link href="/explore">Preencher análise</Link></Button></section>; }
