'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { loadDraft } from '@/lib/storage';
import type { AnalysisResult } from '@/lib/engine/types';
import { Button } from '@/components/ui/button';

type State =
  | { kind: 'loading' }
  | { kind: 'empty' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; data: AnalysisResult };

export function AnalysisResults() {
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    const draft = loadDraft();
    if (!draft) { void Promise.resolve().then(() => setState({ kind: 'empty' })); return; }
    void fetch('/api/analyze', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(draft.data) })
      .then(async (response) => {
        const body: unknown = await response.json();
        if (!response.ok) throw new Error(typeof body === 'object' && body && 'message' in body ? String(body.message) : 'Não foi possível analisar o rascunho.');
        setState({ kind: 'ready', data: body as AnalysisResult });
      })
      .catch((error: unknown) => setState({ kind: 'error', message: error instanceof Error ? error.message : 'Não foi possível analisar o rascunho.' }));
  }, []);

  if (state.kind === 'loading') return <p role="status" className="mt-6 text-slate-300">Analisando rascunho local…</p>;
  if (state.kind === 'empty') return <Empty message="Nenhum rascunho válido foi encontrado neste navegador." />;
  if (state.kind === 'error') return <Empty message={state.message} />;
  if (state.data.scope === 'global_climate_only') return <section className="mt-6 rounded-xl border border-amber-300/50 bg-amber-950/30 p-5"><h2 className="text-xl font-bold">Somente clima global</h2><p className="mt-2 text-slate-200">Esta coordenada está fora do piloto Rio Verde (GO). O aplicativo não gera recomendação agronômica regional.</p>{state.data.warnings.map((warning) => <p className="mt-3 text-sm text-amber-100" key={warning}>{warning}</p>)}<Link className="mt-5 inline-block underline" href="/explore">Editar localização</Link></section>;

  return <section className="mt-6 grid gap-4 lg:grid-cols-3" aria-label="Estratégias avaliadas">
    {state.data.strategies.map((strategy) => <article className="rounded-xl border border-slate-700 bg-slate-900 p-5" key={strategy.id}>
      <p className="text-sm font-semibold text-lime-300">Estratégia {strategy.id}</p><h2 className="mt-1 text-xl font-bold">{strategy.title}</h2>
      {strategy.baselineAssumed && <p className="mt-3 rounded bg-amber-950/60 p-3 text-sm text-amber-100">Continuação presumida — confirmar com produtor.</p>}
      {strategy.unavailable && <p className="mt-3 rounded bg-slate-800 p-3 text-sm text-slate-200">Alternativa indisponível: evidência regional insuficiente.</p>}
      {strategy.timeline.length > 0 && <ol className="mt-4 grid gap-2 text-sm">{strategy.timeline.map((entry) => <li key={`${entry.startYearMonth}-${entry.endYearMonth}`}><span className="font-semibold">{entry.startYearMonth}–{entry.endYearMonth}</span>: {entry.cropIds.join(', ')}</li>)}</ol>}
      {strategy.explanations.map((item) => <div className="mt-4 border-l-2 border-slate-600 pl-3 text-sm" key={item.ruleId}><p>{item.message}</p><p className="mt-1 text-xs text-slate-400">Regra: {item.ruleId} · certeza: {item.certainty}{item.sourceRefs.length ? ` · fonte: ${item.sourceRefs.join(', ')}` : ''}</p></div>)}
      {strategy.score === null && <p className="mt-4 text-xs text-slate-400">Sem nota numérica: comparação defensável ainda não está disponível.</p>}
    </article>)}
  </section>;
}

function Empty({ message }: { message: string }) { return <section className="mt-6 rounded-xl border border-slate-700 p-5"><p>{message}</p><Button asChild className="mt-5"><Link href="/explore">Preencher análise</Link></Button></section>; }
