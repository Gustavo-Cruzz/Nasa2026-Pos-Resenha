'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { loadDraft } from '@/lib/storage';
import type { AnalysisResult, IndicatorState } from '@/lib/engine/types';
import { Button } from '@/components/ui/button';
import { ClimatePanel } from '@/components/results/climate-panel';
import { SourcesDetails } from '@/components/results/sources-details';
import { ScenarioComparisonTable } from '@/components/results/scenario-comparison-table';

type State = { kind: 'loading' } | { kind: 'empty' } | { kind: 'error'; message: string } | { kind: 'ready'; data: AnalysisResult };
const stateText: Record<IndicatorState, string> = { compatible: 'compatível', attention: 'atenção', unknown: 'desconhecido', yes: 'presente', no: 'não catalogado', observed: 'observação' };

export function AnalysisResults() {
  const [state, setState] = useState<State>({ kind: 'loading' });
  useEffect(() => {
    const draft = loadDraft();
    if (!draft) { void Promise.resolve().then(() => setState({ kind: 'empty' })); return; }
    void fetch('/api/analyze', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ input: draft.data, ...(draft.labPlan ? { labPlan: draft.labPlan } : {}) }) })
      .then(async (response) => { const body: unknown = await response.json(); if (!response.ok) throw new Error(typeof body === 'object' && body && 'message' in body ? String(body.message) : 'Não foi possível analisar o rascunho.'); setState({ kind: 'ready', data: body as AnalysisResult }); })
      .catch((error: unknown) => setState({ kind: 'error', message: error instanceof Error ? error.message : 'Não foi possível analisar o rascunho.' }));
  }, []);
  if (state.kind === 'loading') return <p role="status" className="mt-6 text-slate-300">Analisando clima e cenários…</p>;
  if (state.kind === 'empty') return <Empty message="Nenhum rascunho válido foi encontrado neste navegador." />;
  if (state.kind === 'error') return <Empty message={state.message} />;
  const { data } = state;
  return <><div className="mt-5 flex flex-wrap gap-3"><Button asChild variant="secondary"><Link href="/lab">Voltar ao laboratório</Link></Button><Button asChild variant="secondary"><Link href="/farm">Alterar prioridades</Link></Button></div><ClimatePanel climate={data.climate} plantingMonth={data.input.plantingMonth} /><SourcesDetails provenance={data.climate.provenance} sourceRefs={[]} title="Proveniência climática" /><p className="mt-3 text-sm text-amber-100">{data.disclaimer}</p><p className="mt-4 text-sm text-slate-300">Destaques por prioridade: {data.priorityHighlights.join(', ')}. Eles não trocam culturas nem criam nota.</p><ScenarioComparisonTable data={data} /><section className="mt-6 grid gap-4 lg:grid-cols-3" aria-label="Estratégias exploratórias">{data.strategies.map((strategy) => { const sourceRefs = [...strategy.indicators.flatMap((indicator) => indicator.sourceRefs), ...strategy.explanations.flatMap((item) => item.sourceRefs)]; return <article className="rounded-xl border border-slate-700 bg-slate-900 p-5" key={strategy.id}><p className="text-sm font-semibold text-lime-300">Cenário {strategy.id} · {strategy.validationLevel}</p><h2 className="mt-1 text-xl font-bold">{strategy.title}</h2>{strategy.baselineAssumed ? <p className="mt-3 rounded bg-amber-950/60 p-3 text-sm text-amber-100">Continuação presumida — confirmar.</p> : null}{strategy.baseline ? <Link className="mt-3 inline-block text-sm underline" href="/farm?edit=baseline">Editar linha de base</Link> : null}{strategy.proposedCrop ? <div className="mt-4 text-sm"><p><b>Hipótese no laboratório:</b> {strategy.proposedCrop.name}</p><p>Plantio: mês {strategy.proposedCrop.plantingMonth}; duração: desconhecida.</p></div> : <p className="mt-4 text-sm text-amber-100">Cultura proposta indisponível: critério mínimo sem evidência.</p>}<details className="mt-4"><summary className="cursor-pointer font-semibold">Por que este cenário?</summary>{strategy.explanations.length ? strategy.explanations.map((item) => <div className="mt-3 border-l-2 border-slate-600 pl-3 text-sm" key={item.ruleId}><p>{item.message}</p><p className="mt-1 text-xs text-slate-400">Regra: {item.ruleId}{item.sourceRefs.length ? ` · fonte: ${item.sourceRefs.join(', ')}` : ''}</p></div>) : <p className="mt-2 text-sm text-slate-300">Sem explicação adicional além dos indicadores e lacunas.</p>}</details><SourcesDetails sourceRefs={sourceRefs} title="Fontes do cenário" />{strategy.missingData.length ? <p className="mt-4 text-xs text-slate-400">Lacunas: {strategy.missingData.join(', ')}</p> : null}</article>; })}</section></>;
}
function Empty({ message }: { message: string }) { return <section className="mt-6 rounded-xl border border-slate-700 p-5"><p>{message}</p><Button asChild className="mt-5"><Link href="/explore">Preencher análise</Link></Button></section>; }
