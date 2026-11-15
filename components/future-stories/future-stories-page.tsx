'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScenarioStories } from '@/components/future-stories/scenario-stories';
import { useLocale } from '@/components/locale-provider';
import { loadLastAnalysis, saveLastAnalysis } from '@/lib/analysis-cache';
import type { AnalysisResult } from '@/lib/engine/types';
import { buildFarmScenarioViews, stableStringify } from '@/lib/future-farm/adapter';
import { buildDemoScenarioViews } from '@/lib/future-farm/demo';
import { FARM_SCENE_DISCLAIMER, type ScenarioId } from '@/lib/future-farm/types';
import { loadDraft } from '@/lib/storage';

type State = { kind: 'loading' } | { kind: 'empty' } | { kind: 'error'; message: string } | { kind: 'ready'; analysis: AnalysisResult; cachedAt?: string };

/**
 * Reuses the comparison's analysis instead of recreating A/B/C: the cached
 * result is used when it was produced from the current farm input; otherwise
 * the same `/api/analyze` call as the comparison runs once.
 */
function useAnalysis(enabled: boolean): State {
  const [state, setState] = useState<State>({ kind: 'loading' });
  useEffect(() => {
    if (!enabled) return;
    const draft = loadDraft(); const cached = loadLastAnalysis();
    if (!draft) { void Promise.resolve().then(() => setState(cached ? { kind: 'ready', analysis: cached.data, cachedAt: cached.savedAt } : { kind: 'empty' })); return; }
    if (cached && stableStringify(cached.data.input) === stableStringify(draft.data)) { void Promise.resolve().then(() => setState({ kind: 'ready', analysis: cached.data })); return; }
    void fetch('/api/analyze', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ input: draft.data, ...(draft.labPlan ? { labPlan: draft.labPlan } : {}) }) })
      .then(async (response) => { const body: unknown = await response.json(); if (!response.ok) throw new Error(typeof body === 'object' && body && 'message' in body ? String(body.message) : 'analysis failed'); const result = body as AnalysisResult; saveLastAnalysis(result); setState({ kind: 'ready', analysis: result }); })
      .catch((error: unknown) => setState(cached ? { kind: 'ready', analysis: cached.data, cachedAt: cached.savedAt } : { kind: 'error', message: error instanceof Error ? error.message : 'analysis failed' }));
  }, [enabled]);
  return state;
}

export function FutureStoriesPage({ demo, initialScenario }: { demo: boolean; initialScenario?: ScenarioId }) {
  const { locale } = useLocale();
  const en = locale === 'en';
  const state = useAnalysis(!demo);
  // The draft is the farmer's current choice: the scene always follows it, even before re-analysis.
  const draft = useMemo(() => (demo ? undefined : loadDraft()), [demo]);
  const scenarios = useMemo(() => {
    if (demo) return buildDemoScenarioViews(locale);
    if (state.kind !== 'ready') return [];
    return buildFarmScenarioViews({ analysis: state.analysis, currentPlan: draft?.labPlan, croppingSystems: draft?.data.croppingSystems }, locale);
  }, [demo, draft, locale, state]);

  return <section>
    <p className="text-sm font-semibold text-lime-200">{en ? 'Future Farm Stories' : 'Histórias da fazenda futura'}</p>
    <h1 className="page-title font-bold">{en ? 'Explore your possible futures' : 'Explore seus futuros possíveis'}</h1>
    <p className="mt-2 max-w-3xl text-slate-300">{en ? 'Walk through each A/B/C scenario cycle by cycle. The farm drawing shows which crops are in the field; the text panel carries the benefits, risks and evidence from the comparison.' : 'Percorra cada cenário A/B/C ciclo a ciclo. O desenho mostra quais culturas estão no campo; o painel em texto traz benefícios, riscos e evidências da comparação.'}</p>
    <p className="mt-3 text-sm text-amber-100">{FARM_SCENE_DISCLAIMER[locale]}</p>
    {demo ? <aside className="mt-4 rounded-xl border border-cyan-300/60 bg-cyan-500/10 p-4" data-testid="demo-banner"><p className="font-bold text-cyan-100">{en ? 'Fictional demonstration' : 'Demonstração fictícia'}</p><p className="mt-1 text-sm text-slate-200">{en ? 'Curated pre-rendered scenes of an imaginary farm. Your farm, draft and comparison are not read or changed.' : 'Cenas pré-renderizadas de uma fazenda imaginária. Sua fazenda, rascunho e comparação não são lidos nem alterados.'}</p></aside> : null}
    {!demo && state.kind === 'ready' && state.cachedAt ? <p className="mt-4 rounded-xl border border-amber-300 bg-amber-950/40 p-4 text-sm" role="status">{en ? `Showing the last analysis saved on this device (${new Date(state.cachedAt).toLocaleString('en-US')}). Scenes follow your current choices; evidence may be outdated.` : `Mostrando a última análise salva neste dispositivo (${new Date(state.cachedAt).toLocaleString('pt-BR')}). As cenas seguem suas escolhas atuais; as evidências podem estar desatualizadas.`}</p> : null}
    {demo || state.kind === 'ready' ? <ScenarioStories demo={demo} initialScenario={initialScenario} key={demo ? 'demo' : 'farm'} locale={locale} scenarios={scenarios} /> : null}
    {!demo && state.kind === 'loading' ? <p className="mt-6 text-slate-300" role="status">{en ? 'Loading your scenarios…' : 'Carregando seus cenários…'}</p> : null}
    {!demo && (state.kind === 'empty' || state.kind === 'error') ? <div className="mt-6 rounded-xl border border-slate-700 p-5"><p>{state.kind === 'error' ? state.message : en ? 'No saved farm or comparison was found in this browser.' : 'Nenhuma fazenda ou comparação salva foi encontrada neste navegador.'}</p><div className="mt-4 flex flex-wrap gap-3"><Button asChild><Link href="/farm">{en ? 'Register my farm' : 'Cadastrar minha fazenda'}</Link></Button><Button asChild variant="secondary"><Link href="/future-stories?demo=ilustrativa">{en ? 'See the fictional demonstration' : 'Ver demonstração fictícia'}</Link></Button></div></div> : null}
    {!demo && state.kind === 'ready' ? <p className="mt-6 text-sm"><Link className="underline" href="/future-stories?demo=ilustrativa">{en ? 'See the curated fictional demonstration' : 'Ver a demonstração fictícia curada'}</Link></p> : null}
  </section>;
}
