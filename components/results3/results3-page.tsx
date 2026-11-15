'use client';
import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight, CloudSun, Database, Droplets, Layers, MapPin, Mountain, Repeat, Sparkles, TriangleAlert } from 'lucide-react';
import { MonthlyChart, type MonthPoint } from '@/components/atlas/monthly-chart';
import { CropSprite } from '@/components/crops/crop-sprite';
import { JoaoDock, JoaoRail, useActiveBlock, type BlockComment } from '@/components/results3/joao-guide';
import { Chip, type Tone } from '@/components/results2/drawer';
import { WaterVisual } from '@/components/results2/visuals';
import { loadLastAnalysis, saveLastAnalysis } from '@/lib/analysis-cache';
import { loadDraft } from '@/lib/storage';
import type { AnalysisResult, Rotation } from '@/lib/engine/types';
import { buildFarmExplanationContext, explanationSectionIds, farmExplanationSchema, fallbackFarmExplanation, type ExplanationSectionId } from '@/lib/gemini/farm-explanation';
import { cropDisplayName } from '@/lib/presentation';

type PageState = { kind: 'loading' } | { kind: 'empty' } | { kind: 'error'; message: string } | { kind: 'ready'; data: AnalysisResult; stale: boolean };
type ExplainState = { kind: 'loading' } | { kind: 'ready'; comments: Record<ExplanationSectionId, BlockComment>; origin: 'gemini' | 'fallback'; warning?: string };
type Block = { id: ExplanationSectionId; title: string; takeaway: string; status: string; tone: Tone; icon: ReactNode; body: ReactNode; comment: BlockComment };
const IDS = [...explanationSectionIds];
const observationLabels: Record<string, string> = { waterlogging: 'água empoçada', compaction: 'solo compactado', erosion: 'erosão', dry_cracked: 'solo seco e rachado', salt_crust: 'crosta de sais', discoloration: 'mudança de cor', other: 'outra observação' };

function commentRecord(data: AnalysisResult): Record<ExplanationSectionId, BlockComment> {
  const result = fallbackFarmExplanation(buildFarmExplanationContext(data));
  return Object.fromEntries(result.sections.map((section) => [section.id, { happening: section.summary, points: section.points, limit: section.limitation }])) as Record<ExplanationSectionId, BlockComment>;
}
function toneFor(strategy: Rotation): Tone { return strategy.unavailable || strategy.indicators.some((item) => item.state === 'attention') ? 'attention' : strategy.indicators.every((item) => item.state === 'unknown') ? 'info' : 'ok'; }
function statusFor(strategy: Rotation): string { return strategy.unavailable ? 'Indisponível' : strategy.indicators.some((item) => item.state === 'attention') ? 'Pede atenção' : strategy.indicators.some((item) => item.state === 'compatible' || item.state === 'yes') ? 'Tem evidência' : 'Dados parciais'; }
function fmt(value: number | null | undefined, unit = ''): string { return value === null || value === undefined ? 'N/D' : `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value)}${unit}`; }

export function Results3Page() {
  const [state, setState] = useState<PageState>({ kind: 'loading' });
  const [explain, setExplain] = useState<ExplainState>({ kind: 'loading' });
  const [guide, setGuide] = useState(true);
  const activeId = useActiveBlock(IDS);
  useEffect(() => {
    const draft = loadDraft();
    if (!draft) { const cached = loadLastAnalysis(); void Promise.resolve().then(() => setState(cached ? { kind: 'ready', data: cached.data, stale: true } : { kind: 'empty' })); return; }
    void fetch('/api/analyze', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ input: draft.data, ...(draft.labPlan ? { labPlan: draft.labPlan } : {}) }) })
      .then(async (response) => { const body: unknown = await response.json(); if (!response.ok) throw new Error(typeof body === 'object' && body && 'message' in body ? String(body.message) : 'Não foi possível analisar os dados.'); const data = body as AnalysisResult; saveLastAnalysis(data); setState({ kind: 'ready', data, stale: false }); })
      .catch((error: unknown) => { const cached = loadLastAnalysis(); setState(cached ? { kind: 'ready', data: cached.data, stale: true } : { kind: 'error', message: error instanceof Error ? error.message : 'Não foi possível analisar os dados.' }); });
  }, []);
  useEffect(() => {
    if (state.kind !== 'ready') return;
    const fallback = commentRecord(state.data);
    void fetch('/api/explain-farm', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ context: buildFarmExplanationContext(state.data) }) })
      .then(async (response) => { if (!response.ok) throw new Error(); const raw: unknown = await response.json(); const parsed = farmExplanationSchema.parse(raw); const meta = raw as { origin?: unknown; warning?: unknown }; const comments = Object.fromEntries(parsed.sections.map((section) => [section.id, { happening: section.summary, points: section.points, limit: section.limitation }])) as Record<ExplanationSectionId, BlockComment>; setExplain({ kind: 'ready', comments, origin: meta.origin === 'gemini' ? 'gemini' : 'fallback', ...(typeof meta.warning === 'string' ? { warning: meta.warning } : {}) }); })
      .catch(() => setExplain({ kind: 'ready', comments: fallback, origin: 'fallback', warning: 'A explicação automática está temporariamente indisponível.' }));
  }, [state]);
  const data = state.kind === 'ready' ? state.data : null;
  const comments = data ? (explain.kind === 'ready' ? explain.comments : commentRecord(data)) : null;
  const blocks = useMemo(() => data && comments ? buildBlocks(data, comments) : [], [data, comments]);
  const active = blocks.find((block) => block.id === activeId) ?? null;
  if (state.kind === 'loading') return <p className="mt-8 text-slate-300" role="status">Carregando os resultados reais da fazenda…</p>;
  if (state.kind === 'empty') return <Empty message="Nenhum resultado foi encontrado neste navegador." />;
  if (state.kind === 'error') return <Empty message={state.message} />;
  const readyData = state.data;
  const place = readyData.regionalContext.municipality ? `${readyData.regionalContext.municipality.name} (${readyData.regionalContext.municipality.uf})` : `${readyData.input.location.latitude.toFixed(3)}, ${readyData.input.location.longitude.toFixed(3)}`;
  const last = readyData.input.history.at(-1); const lastCrop = cropDisplayName(last?.cropId, last?.otherLabel, 'pt-BR');
  return <section className="mx-auto max-w-6xl pb-28 lg:pb-0" id="results3-readable">
    {state.stale ? <p className="flex gap-2 rounded-xl border border-amber-300/40 bg-amber-950/20 p-3 text-sm text-amber-100"><TriangleAlert size={18} />A análise ao vivo falhou; mostrando o último resultado salvo neste dispositivo.</p> : null}
    <header className="mt-6 flex flex-wrap items-end justify-between gap-4"><div data-readable><p className="text-sm font-semibold text-lime-200">Resultado da sua fazenda</p><h1 className="page-title font-bold">Entenda seus resultados</h1><ul className="mt-4 flex flex-wrap gap-2 text-sm"><li className="inline-flex items-center gap-1.5 rounded-full border border-slate-600 bg-slate-900/70 px-3 py-1.5"><MapPin className="text-lime-300" size={14} />{place}</li><li className="inline-flex items-center gap-1.5 rounded-full border border-slate-600 bg-slate-900/70 px-3 py-1.5"><CropSprite cropId={last?.cropId ?? 'unknown'} name={lastCrop} size={18} />Último cultivo: {lastCrop}</li></ul></div><button aria-checked={guide} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-slate-600 px-4 text-sm font-semibold hover:border-lime-300" onClick={() => setGuide((value) => !value)} role="switch" type="button"><Sparkles size={16} />Explicações do João</button></header>
    <p className="mt-4 text-xs text-slate-400" role="status">{explain.kind === 'loading' ? 'João está preparando uma explicação curta dos dados…' : explain.origin === 'gemini' ? 'Explicações geradas com Gemini 3.5 Flash-Lite a partir deste resultado.' : `Explicação segura do aplicativo. ${explain.warning ?? ''}`}</p>
    <div className={`mt-8 grid gap-y-6 ${guide ? 'lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-x-8' : ''}`}>{blocks.map((block) => <Fragment key={block.id}><article className={`min-w-0 self-start rounded-2xl border bg-slate-900/70 p-4 sm:p-5 ${guide && activeId === block.id ? 'border-lime-300/70' : 'border-slate-700'}`} data-joao-block data-readable id={`block-${block.id}`}><header className="flex items-center gap-3"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-slate-800 text-lime-200">{block.icon}</span><div className="min-w-0 flex-1"><h2 className="text-lg font-bold leading-tight">{block.title}</h2><p className="mt-0.5 text-sm text-slate-300">{block.takeaway}</p></div><Chip tone={block.tone}>{block.status}</Chip></header><div className="mt-5 min-w-0">{block.body}</div></article>{guide ? <JoaoRail active={activeId === block.id} comment={block.comment} title={block.title} tone={block.tone === 'ok' ? 'good' : block.tone} /> : null}</Fragment>)}</div>
    <section className="mt-10 rounded-2xl border border-slate-700 bg-slate-900/60 p-5" data-readable><h2 className="text-xl font-bold">E agora?</h2><p className="mt-2 text-sm text-slate-300">Use estes dados para preparar perguntas e confirme decisões com assistência técnica e observações do talhão.</p><div className="mt-4 flex flex-wrap gap-3"><Link className="inline-flex items-center gap-2 rounded-lg bg-lime-300 px-4 py-2.5 font-bold text-slate-950" href="/farm">Alterar dados<ArrowRight size={18} /></Link><Link className="rounded-lg border border-slate-600 px-4 py-2.5 font-semibold" href="/methodology">Ver metodologia</Link></div></section>
    {guide ? <JoaoDock block={active ? { id: active.id, title: active.title, tone: active.tone === 'ok' ? 'good' : active.tone, comment: active.comment } : null} /> : null}
  </section>;
}

function buildBlocks(data: AnalysisResult, comments: Record<ExplanationSectionId, BlockComment>): Block[] {
  const points: MonthPoint[] = Array.from({ length: 12 }, (_, index) => ({ month: index + 1, rainMm: data.climate.historicalPrecipitationByMonth.find((item) => item.month === index + 1)?.medianTotalMm ?? null, tempC: data.climate.monthly.find((item) => item.month === index + 1)?.tmeanMedianC ?? null }));
  const rawBalance = Array.from({ length: 12 }, (_, index) => data.climate.waterBalanceByMonth?.find((item) => item.month === index + 1)?.balanceMedianMm ?? null);
  const hasCompleteBalance = rawBalance.every((value): value is number => value !== null);
  const balance = hasCompleteBalance ? rawBalance : [];
  const staticSoil = data.soilContext?.staticProfile.status === 'available' ? data.soilContext.staticProfile.attributes : null;
  const soilValues = [{ label: 'pH em água', value: fmt(data.input.soil?.ph ?? staticSoil?.phh2o.value) }, { label: 'Carbono orgânico', value: fmt(data.input.soil?.organicCarbonGKg ?? staticSoil?.soc.value, ' g/kg') }, { label: 'Areia', value: fmt(data.input.soil?.sandPct ?? staticSoil?.sand.value, '%') }, { label: 'Argila', value: fmt(data.input.soil?.clayPct ?? staticSoil?.clay.value, '%') }];
  return [
    { id: 'overview', title: 'Cenários para comparar', takeaway: 'A, B e C são hipóteses, não ranking de sucesso.', status: '3 cenários', tone: 'info', icon: <Database size={24} />, body: <div className="grid gap-3 sm:grid-cols-3">{data.strategies.map((strategy) => { const name = cropDisplayName(strategy.proposedCrop?.cropId, strategy.proposedCrop?.name, 'pt-BR'); return <article className="rounded-xl border border-slate-700 bg-slate-950/40 p-3" key={strategy.id}><div className="flex items-center justify-between"><b>Cenário {strategy.id}</b><Chip tone={toneFor(strategy)}>{statusFor(strategy)}</Chip></div><p className="mt-2 text-sm font-semibold">{strategy.title}</p>{strategy.proposedCrop ? <div className="mt-3 flex items-center gap-2"><CropSprite cropId={strategy.proposedCrop.cropId} name={name} size={36} /><span>{name}</span></div> : <p className="mt-3 text-sm text-slate-400">Sem cultura definida</p>}<p className="mt-2 text-xs text-slate-400">{strategy.missingData.length} lacuna(s) registrada(s)</p></article>; })}</div>, comment: comments.overview },
    { id: 'climate', title: 'Chuva e temperatura', takeaway: data.climate.status === 'available' ? 'Histórico mensal NASA POWER de 2011 a 2025.' : 'Clima histórico indisponível.', status: data.climate.status === 'available' ? 'Disponível' : 'N/D', tone: data.climate.status === 'available' ? 'ok' : 'attention', icon: <CloudSun size={24} />, body: <MonthlyChart currentMonth={data.input.plantingMonth} history="mediana 2011–2025" points={points} />, comment: comments.climate },
    { id: 'water', title: 'Chuva menos ET₀', takeaway: 'Barras mostram um indicador climático mensal.', status: hasCompleteBalance ? '12 meses' : 'N/D', tone: hasCompleteBalance ? 'info' : 'attention', icon: <Droplets size={24} />, body: hasCompleteBalance ? <WaterVisual balance={balance} /> : <Unavailable />, comment: comments.water },
    { id: 'soil', title: 'Contexto do solo', takeaway: data.input.soil ? 'Dados informados pelo produtor.' : 'Estimativa regional; não é análise do talhão.', status: data.soilContext?.status === 'available' ? 'Disponível' : 'Parcial', tone: data.input.soilObservation ? 'attention' : 'info', icon: <Layers size={24} />, body: <><dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">{soilValues.map((item) => <div className="rounded-lg bg-slate-950/50 p-3" key={item.label}><dt className="text-xs text-slate-400">{item.label}</dt><dd className="mt-1 font-bold">{item.value}</dd></div>)}</dl>{data.input.soilObservation ? <p className="mt-3 text-sm text-amber-100"><b>Relato do produtor:</b> {data.input.soilObservation.kinds.map((item) => observationLabels[item] ?? item).join(', ')}.</p> : null}</>, comment: comments.soil },
    { id: 'rotation', title: 'Histórico e cenários', takeaway: 'Compare sequência recente com as três hipóteses.', status: `${data.input.history.length} registro(s)`, tone: 'info', icon: <Repeat size={24} />, body: <div className="grid gap-3 sm:grid-cols-2"><div><h3 className="text-sm font-bold">Histórico informado</h3><ol className="mt-2 grid gap-2">{data.input.history.map((item) => <li className="rounded-lg bg-slate-950/50 p-3 text-sm" key={`${item.startYearMonth}-${item.endYearMonth}`}><b>{cropDisplayName(item.cropId, item.otherLabel, 'pt-BR')}</b><span className="block text-slate-400">{item.startYearMonth} → {item.endYearMonth}</span></li>)}</ol></div><div><h3 className="text-sm font-bold">Próximas hipóteses</h3><ol className="mt-2 grid gap-2">{data.strategies.map((item) => <li className="rounded-lg bg-slate-950/50 p-3 text-sm" key={item.id}><b>{item.id} · {cropDisplayName(item.proposedCrop?.cropId, item.proposedCrop?.name, 'pt-BR')}</b><span className="block text-slate-400">{item.baselineAssumed ? 'Continuação presumida — confirmar' : item.title}</span></li>)}</ol></div></div>, comment: comments.rotation },
    { id: 'terrain', title: 'Relevo amostrado', takeaway: data.terrain?.status === 'available' ? 'Inclinação derivada de amostras NASA SRTM.' : 'Relevo indisponível.', status: data.terrain?.status === 'available' ? fmt(data.terrain.slopePct?.mean, '% média') : 'N/D', tone: data.terrain?.status === 'available' && data.terrain.hotspots.sharePct > 0 ? 'attention' : 'info', icon: <Mountain size={24} />, body: data.terrain?.status === 'available' ? <dl className="grid grid-cols-3 gap-3">{[['Inclinação média', fmt(data.terrain.slopePct?.mean, '%')], ['Inclinação máxima', fmt(data.terrain.slopePct?.max, '%')], ['Amostras ≥ 8%', fmt(data.terrain.hotspots.sharePct, '%')]].map(([label, value]) => <div className="rounded-lg bg-slate-950/50 p-3" key={label}><dt className="text-xs text-slate-400">{label}</dt><dd className="mt-1 font-bold">{value}</dd></div>)}</dl> : <Unavailable />, comment: comments.terrain },
  ];
}
function Unavailable() { return <p className="rounded-lg bg-slate-950/50 p-4 text-sm text-slate-400">Dado não disponível; nenhuma estimativa foi inventada.</p>; }
function Empty({ message }: { message: string }) { return <section className="mt-8 rounded-xl border border-slate-700 bg-slate-900 p-6"><h1 className="text-xl font-bold">Resultado indisponível</h1><p className="mt-2 text-slate-300">{message}</p><Link className="mt-4 inline-flex rounded-lg bg-lime-300 px-4 py-2 font-bold text-slate-950" href="/explore">Começar análise</Link></section>; }
