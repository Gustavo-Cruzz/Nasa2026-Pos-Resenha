'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { loadDraft, type Draft } from '@/lib/storage';
import { analysisMatchesDraft, loadLastAnalysis, saveLastAnalysis } from '@/lib/analysis-cache';
import type { AnalysisResult } from '@/lib/engine/types';
import { Button } from '@/components/ui/button';
import { PixelAnimation } from '@/components/pixel/pixel-animation';
import { useLocale } from '@/components/locale-provider';
import { recordJourneyCompletion } from '@/lib/journey-metrics';
import { SimpleComparison } from '@/components/results/simple-comparison';
import { RotationTimelineView } from '@/components/rotation-timeline/rotation-timeline-view';

type State = { kind: 'loading' } | { kind: 'empty' } | { kind: 'error'; message: string } | { kind: 'ready'; data: AnalysisResult; draft: Draft; cachedAt?: string };
export function AnalysisResults({ demo = false }: { demo?: boolean }) {
  const { locale } = useLocale();
  const en = locale === 'en';
  const router = useRouter(); const pathname = usePathname(); const searchParams = useSearchParams();
  const mode = searchParams.get('mode') === 'advanced' ? 'advanced' : 'simple';
  const setMode = (next: 'simple' | 'advanced') => { const params = new URLSearchParams(searchParams.toString()); if (next === 'simple') params.delete('mode'); else params.set('mode', next); router.replace(`${pathname}${params.size ? `?${params}` : ''}`, { scroll: false }); };
  const [state, setState] = useState<State>({ kind: 'loading' });
  useEffect(() => {
    const draft = loadDraft();
    if (!draft) { void Promise.resolve().then(() => setState({ kind: 'empty' })); return; }
    const cached = loadLastAnalysis();
    if (cached && analysisMatchesDraft(cached.data, draft.data, draft.labPlan)) { void Promise.resolve().then(() => setState({ kind: 'ready', data: cached.data, draft, cachedAt: cached.savedAt })); return; }
    void fetch('/api/analyze', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ input: draft.data, ...(draft.labPlan ? { labPlan: draft.labPlan } : {}) }) })
      .then(async (response) => { const body: unknown = await response.json(); if (!response.ok) throw new Error(typeof body === 'object' && body && 'message' in body ? String(body.message) : 'Não foi possível analisar o rascunho.'); const result = body as AnalysisResult; saveLastAnalysis(result); setState({ kind: 'ready', data: result, draft }); })
      .catch((error: unknown) => setState({ kind: 'error', message: error instanceof Error ? error.message : 'Não foi possível analisar o rascunho.' }));
  }, []);
  useEffect(() => { if (state.kind === 'ready') recordJourneyCompletion(); }, [state.kind]);
  if (state.kind === 'loading') return <p role="status" className="mt-6 flex items-center gap-3 text-slate-300"><PixelAnimation fallback="/assets/interactions/analysis-loading-static.png" frames={8} loop sheet="/assets/interactions/analysis-loading-sheet.png" />{en ? 'Analyzing climate and scenarios…' : 'Analisando clima e cenários…'}</p>;
  if (state.kind === 'empty') return <Empty message={en ? 'No valid draft was found in this browser.' : 'Nenhum rascunho válido foi encontrado neste navegador.'} />;
  if (state.kind === 'error') return <Empty message={state.message} />;
  const ready = state.data;
  return <section className="mx-auto max-w-6xl pb-28 lg:pb-0" id="results-readable">
    <div className="mt-5" role="tablist" aria-label={en ? 'Comparison mode' : 'Modo de comparação'} onKeyDown={(event) => { if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && event.key !== 'Home' && event.key !== 'End') return; event.preventDefault(); const next = event.key === 'ArrowLeft' || event.key === 'Home' ? 'simple' : 'advanced'; setMode(next); window.setTimeout(() => document.getElementById(`${next}-comparison-tab`)?.focus()); }}><button aria-controls="results-mode-panel" aria-selected={mode === 'simple'} className={`min-h-11 rounded-l-lg border px-4 text-sm font-semibold ${mode === 'simple' ? 'border-lime-300 bg-lime-300 text-slate-950' : 'border-slate-600 bg-slate-900 hover:border-lime-300'}`} id="simple-comparison-tab" role="tab" tabIndex={mode === 'simple' ? 0 : -1} type="button" onClick={() => setMode('simple')}>🌱 {en ? 'Simple comparison' : 'Comparação simples'}</button><button aria-controls="results-mode-panel" aria-selected={mode === 'advanced'} className={`-ml-px min-h-11 rounded-r-lg border px-4 text-sm font-semibold ${mode === 'advanced' ? 'border-lime-300 bg-lime-300 text-slate-950' : 'border-slate-600 bg-slate-900 hover:border-lime-300'}`} id="advanced-comparison-tab" role="tab" tabIndex={mode === 'advanced' ? 0 : -1} type="button" onClick={() => setMode('advanced')}>📊 {en ? 'Advanced comparison' : 'Comparação avançada'}</button></div>
    {demo ? <aside className="mt-5 rounded-xl border border-cyan-300/60 bg-cyan-500/10 p-4"><p className="font-bold text-cyan-100">{en ? 'Brazil demonstration' : 'Demonstração Brasil'}</p><p className="mt-1 text-sm text-slate-200">Rio Verde · NASA POWER + {en ? 'municipal ZARC context' : 'contexto ZARC municipal'}.</p></aside> : null}
    <div aria-labelledby={mode === 'simple' ? 'simple-comparison-tab' : 'advanced-comparison-tab'} id="results-mode-panel" role="tabpanel">
    {mode === 'advanced' ? <RotationTimelineView data={ready} /> : <SimpleComparison croppingSystems={state.draft.data.croppingSystems} data={ready} plan={state.draft.labPlan} onAdvanced={() => setMode('advanced')} />}
    </div>
  </section>;
}

function Empty({ message }: { message: string }) { const { locale } = useLocale(); return <section className="mt-6 rounded-xl border border-slate-700 p-5"><p>{message}</p><Button asChild className="mt-5"><Link href="/farm">{locale === 'en' ? 'Start analysis' : 'Preencher análise'}</Link></Button></section>; }
