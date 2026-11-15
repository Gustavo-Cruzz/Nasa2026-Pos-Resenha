'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { MapPin, Sparkles, TriangleAlert } from 'lucide-react';
import { loadDraft, type Draft } from '@/lib/storage';
import { analysisMatchesDraft, loadLastAnalysis, saveLastAnalysis } from '@/lib/analysis-cache';
import type { AnalysisResult } from '@/lib/engine/types';
import { Button } from '@/components/ui/button';
import { CropSprite } from '@/components/crops/crop-sprite';
import { PixelAnimation } from '@/components/pixel/pixel-animation';
import { ReviewTransition } from '@/components/pixel/review-transition';
import { ExportSummaryButton } from '@/components/results/export-summary-button';
import { buildBlocks } from '@/components/results/results-blocks';
import { blockIds, localBlockComments, sectionForBlock, type BlockId } from '@/components/results/block-comments';
import { Chip } from '@/components/results2/drawer';
import { JoaoDock, JoaoRail, joaoToneOf, useActiveBlock, type BlockComment } from '@/components/results3/joao-guide';
import { useLocale } from '@/components/locale-provider';
import { recordJourneyCompletion } from '@/lib/journey-metrics';
import { buildFarmExplanationContext, explanationSectionIds, farmExplanationSchema, fallbackFarmExplanation, type ExplanationSectionId } from '@/lib/gemini/farm-explanation';
import type { Locale } from '@/lib/i18n';
import { cropDisplayName } from '@/lib/presentation';
import { SimpleComparison } from '@/components/results/simple-comparison';

type State = { kind: 'loading' } | { kind: 'empty' } | { kind: 'error'; message: string } | { kind: 'ready'; data: AnalysisResult; draft: Draft; cachedAt?: string };
type ExplainState = { kind: 'loading' } | { kind: 'ready'; sections: Record<ExplanationSectionId, BlockComment>; origin: 'gemini' | 'fallback'; warning?: string };
const IDS: string[] = [...blockIds];

const toSections = (sections: Array<{ id: ExplanationSectionId; summary: string; points: string[]; limitation: string }>) => Object.fromEntries(sections.map((section) => [section.id, { happening: section.summary, points: section.points, limit: section.limitation }])) as Record<ExplanationSectionId, BlockComment>;

const unavailableComment = (locale: Locale): BlockComment => locale === 'en' ? { happening: 'João could not prepare a comment for this block from the data.', limit: 'Read the values and the sources directly; nothing was inferred.' } : { happening: 'O João não conseguiu preparar um comentário deste bloco a partir dos dados.', limit: 'Leia os valores e as fontes diretamente; nada foi inferido.' };
/** Built-in comments; if the data cannot be summarised (schema limits) João says so instead of the page failing. */
function builtInSections(data: AnalysisResult, locale: Locale): Record<ExplanationSectionId, BlockComment> {
  try { return toSections(fallbackFarmExplanation(buildFarmExplanationContext(data), locale).sections); } catch { return Object.fromEntries(explanationSectionIds.map((id) => [id, unavailableComment(locale)])) as Record<ExplanationSectionId, BlockComment>; }
}

export function AnalysisResults({ demo = false }: { demo?: boolean }) {
  const { locale } = useLocale();
  const en = locale === 'en';
  const router = useRouter(); const pathname = usePathname(); const searchParams = useSearchParams();
  const mode = searchParams.get('mode') === 'advanced' ? 'advanced' : 'simple';
  const setMode = (next: 'simple' | 'advanced') => { const params = new URLSearchParams(searchParams.toString()); if (next === 'simple') params.delete('mode'); else params.set('mode', next); router.replace(`${pathname}${params.size ? `?${params}` : ''}`, { scroll: false }); };
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [explain, setExplain] = useState<ExplainState & { locale?: Locale }>({ kind: 'loading' });
  const [guide, setGuide] = useState(true);
  const activeId = useActiveBlock(IDS);
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
  useEffect(() => {
    if (state.kind !== 'ready' || mode !== 'advanced') return;
    let cancelled = false;
    let context: ReturnType<typeof buildFarmExplanationContext>;
    try { context = buildFarmExplanationContext(state.data); } catch { void Promise.resolve().then(() => { if (!cancelled) setExplain({ kind: 'ready', locale, sections: builtInSections(state.data, locale), origin: 'fallback' }); }); return () => { cancelled = true; }; }
    void fetch('/api/explain-farm', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ context, locale }) })
      .then(async (response) => { if (!response.ok) throw new Error('explain failed'); const raw: unknown = await response.json(); const parsed = farmExplanationSchema.parse(raw); const meta = raw as { origin?: unknown; warning?: unknown }; if (!cancelled) setExplain({ kind: 'ready', locale, sections: toSections(parsed.sections), origin: meta.origin === 'gemini' ? 'gemini' : 'fallback', ...(typeof meta.warning === 'string' ? { warning: meta.warning } : {}) }); })
      .catch(() => { if (!cancelled) setExplain({ kind: 'ready', locale, sections: builtInSections(state.data, locale), origin: 'fallback', warning: en ? 'The automatic explanation is temporarily unavailable.' : 'A explicação automática está temporariamente indisponível.' }); });
    return () => { cancelled = true; };
  }, [state, locale, en, mode]);
  const data = state.kind === 'ready' ? state.data : null;
  const blocks = useMemo(() => {
    if (!data || mode !== 'advanced') return [];
    const sections = explain.kind === 'ready' && explain.locale === locale ? explain.sections : builtInSections(data, locale);
    const local = localBlockComments(data, locale);
    const comments = Object.fromEntries(blockIds.map((id) => { const section = sectionForBlock[id]; return [id, section ? sections[section] : local[id as keyof typeof local]]; })) as Record<BlockId, BlockComment>;
    return buildBlocks(data, comments, locale);
  }, [data, explain, locale, mode]);
  const active = blocks.find((block) => block.id === activeId) ?? null;
  if (state.kind === 'loading') return <p role="status" className="mt-6 flex items-center gap-3 text-slate-300"><PixelAnimation fallback="/assets/interactions/analysis-loading-static.png" frames={8} loop sheet="/assets/interactions/analysis-loading-sheet.png" />{en ? 'Analyzing climate and scenarios…' : 'Analisando clima e cenários…'}</p>;
  if (state.kind === 'empty') return <Empty message={en ? 'No valid draft was found in this browser.' : 'Nenhum rascunho válido foi encontrado neste navegador.'} />;
  if (state.kind === 'error') return <Empty message={state.message} />;
  const ready = state.data;
  const place = ready.regionalContext.municipality ? `${ready.regionalContext.municipality.name} (${ready.regionalContext.municipality.uf})` : `${ready.input.location.latitude.toFixed(3)}, ${ready.input.location.longitude.toFixed(3)}`;
  const last = ready.input.history.at(-1);
  const lastCrop = cropDisplayName(last?.cropId, last?.otherLabel, locale);
  const dock = active ? { id: active.id, title: active.title, tone: joaoToneOf(active.tone), comment: active.comment } : null;
  const origin = explain.kind === 'loading' ? (en ? 'João is preparing a short explanation of the data…' : 'João está preparando uma explicação curta dos dados…') : explain.origin === 'gemini' ? (en ? 'Explanations generated with Gemini 3.5 Flash-Lite from this result.' : 'Explicações geradas com Gemini 3.5 Flash-Lite a partir deste resultado.') : `${en ? 'Safe built-in explanation.' : 'Explicação segura do aplicativo.'} ${explain.warning ?? ''}`;
  return <section className="mx-auto max-w-6xl pb-28 lg:pb-0" id="results-readable">
    <ReviewTransition />
    <div className="mt-5" role="tablist" aria-label={en ? 'Comparison mode' : 'Modo de comparação'} onKeyDown={(event) => { if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && event.key !== 'Home' && event.key !== 'End') return; event.preventDefault(); const next = event.key === 'ArrowLeft' || event.key === 'Home' ? 'simple' : 'advanced'; setMode(next); window.setTimeout(() => document.getElementById(`${next}-comparison-tab`)?.focus()); }}><button aria-controls="results-mode-panel" aria-selected={mode === 'simple'} className={`min-h-11 rounded-l-lg border px-4 text-sm font-semibold ${mode === 'simple' ? 'border-lime-300 bg-lime-300 text-slate-950' : 'border-slate-600 bg-slate-900 hover:border-lime-300'}`} id="simple-comparison-tab" role="tab" tabIndex={mode === 'simple' ? 0 : -1} type="button" onClick={() => setMode('simple')}>🌱 {en ? 'Simple comparison' : 'Comparação simples'}</button><button aria-controls="results-mode-panel" aria-selected={mode === 'advanced'} className={`-ml-px min-h-11 rounded-r-lg border px-4 text-sm font-semibold ${mode === 'advanced' ? 'border-lime-300 bg-lime-300 text-slate-950' : 'border-slate-600 bg-slate-900 hover:border-lime-300'}`} id="advanced-comparison-tab" role="tab" tabIndex={mode === 'advanced' ? 0 : -1} type="button" onClick={() => setMode('advanced')}>📊 {en ? 'Advanced comparison' : 'Comparação avançada'}</button></div>
    {demo ? <aside className="mt-5 rounded-xl border border-cyan-300/60 bg-cyan-500/10 p-4"><p className="font-bold text-cyan-100">{en ? 'Brazil demonstration' : 'Demonstração Brasil'}</p><p className="mt-1 text-sm text-slate-200">Rio Verde · NASA POWER + {en ? 'municipal ZARC context' : 'contexto ZARC municipal'}.</p></aside> : null}
    {state.cachedAt ? <p className="mt-5 flex gap-2 rounded-xl border border-amber-300 bg-amber-950/40 p-4 text-sm" role="status"><TriangleAlert aria-hidden="true" className="mt-0.5 shrink-0" size={18} /><span><b>{en ? 'Saved analysis.' : 'Análise salva.'}</b> {en ? `Reusing the compatible analysis saved on this device (${new Date(state.cachedAt).toLocaleString('en-US')}).` : `Reutilizando a análise compatível salva neste dispositivo (${new Date(state.cachedAt).toLocaleString('pt-BR')}).`}</span></p> : null}
    <div aria-labelledby={mode === 'simple' ? 'simple-comparison-tab' : 'advanced-comparison-tab'} id="results-mode-panel" role="tabpanel">
    {mode === 'advanced' ? <><header className="mt-6 max-w-3xl"><p className="text-sm font-semibold text-lime-200">{en ? 'Advanced comparison' : 'Comparação avançada'}</p><h2 className="mt-1 text-3xl font-bold">{en ? 'Complete scientific analysis' : 'Análise científica completa'}</h2><p className="mt-2 text-slate-300">{en ? 'Explore the indicators, sources, methods and uncertainties used in this comparison.' : 'Explore os indicadores, fontes, métodos e incertezas utilizados na comparação.'}</p><button className="mt-3 text-sm font-semibold underline" type="button" onClick={() => setMode('simple')}>{en ? 'Back to simple comparison' : 'Voltar à comparação simples'}</button></header>
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
      <ul className="flex flex-wrap gap-2 text-sm"><li className="inline-flex items-center gap-1.5 rounded-full border border-slate-600 bg-slate-900/70 px-3 py-1.5"><MapPin aria-hidden="true" className="text-lime-300" size={14} />{place}</li><li className="inline-flex items-center gap-1.5 rounded-full border border-slate-600 bg-slate-900/70 px-3 py-1.5"><CropSprite cropId={last?.cropId ?? 'unknown'} name={lastCrop} size={18} />{en ? 'Last crop' : 'Último cultivo'}: {lastCrop}</li></ul>
      <button aria-checked={guide} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full border px-4 text-sm font-semibold hover:border-lime-300 ${guide ? 'border-lime-300/70 bg-lime-300/10' : 'border-slate-600'}`} onClick={() => setGuide((value) => !value)} role="switch" type="button"><Sparkles aria-hidden="true" size={16} />{en ? 'João’s explanations' : 'Explicações do João'}</button>
    </div>
    <div className="mt-4 flex flex-wrap gap-3"><Button asChild variant="secondary"><Link href="/lab">{en ? 'Back to laboratory' : 'Voltar ao laboratório'}</Link></Button><Button asChild variant="secondary"><Link href="/farm/historico">{en ? 'Edit farm data' : 'Alterar dados da fazenda'}</Link></Button><ExportSummaryButton data={ready} /></div>
    <p className="mt-4 text-xs text-slate-400" role="status">{origin}</p>
    <div className={`mt-6 grid gap-y-6 ${guide ? 'lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-x-8' : ''}`}>{blocks.map((block) => <Fragment key={block.id}>
      <article aria-labelledby={`block-title-${block.id}`} className={`min-w-0 scroll-mt-4 self-start rounded-2xl border bg-slate-900/70 p-4 sm:p-5 ${guide && activeId === block.id ? 'border-lime-300/70' : 'border-slate-700'}`} data-joao-block id={`block-${block.id}`}>
        <header className="flex items-center gap-3"><span aria-hidden="true" className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-slate-800 text-lime-200">{block.icon}</span><div className="min-w-0 flex-1"><h2 className="text-lg font-bold leading-tight" id={`block-title-${block.id}`}>{block.title}</h2><p className="mt-0.5 text-sm text-slate-300">{block.takeaway}</p></div><Chip tone={block.tone}>{block.status}</Chip></header>
        <div className="mt-5 min-w-0">{block.body}</div>
      </article>
      {guide ? <JoaoRail active={activeId === block.id} comment={block.comment} title={block.title} tone={joaoToneOf(block.tone)} /> : null}
    </Fragment>)}</div>
    {guide ? <JoaoDock block={dock} /> : null}
    </> : <SimpleComparison croppingSystems={state.draft.data.croppingSystems} data={ready} plan={state.draft.labPlan} onAdvanced={() => setMode('advanced')} />}
    </div>
  </section>;
}

function Empty({ message }: { message: string }) { const { locale } = useLocale(); return <section className="mt-6 rounded-xl border border-slate-700 p-5"><p>{message}</p><Button asChild className="mt-5"><Link href="/explore">{locale === 'en' ? 'Start analysis' : 'Preencher análise'}</Link></Button></section>; }
