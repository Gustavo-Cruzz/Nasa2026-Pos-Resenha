'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, MessageCircle, Pentagon, RefreshCw, SlidersHorizontal } from 'lucide-react';
import { atlasPointSchema, ATLAS_EXAMPLES, climateApiResponseSchema, type AtlasPoint, type AtlasPolygon, type ClimateApiResponse, type MapLayers } from '@/lib/atlas';
import type { PlaceMatch } from '@/lib/brazil/places';
import { Button } from '@/components/ui/button';
import { WorldMap } from '@/components/atlas/world-map';
import { MapOverlay } from '@/components/atlas/map-overlay';
import { useLiveWeather } from '@/components/atlas/use-live-weather';
import { PlaceSearch } from '@/components/atlas/place-search';
import { MonthlyChart, type MonthPoint } from '@/components/atlas/monthly-chart';
import { PlantingPanels } from '@/components/atlas/planting-panels';
import { ExploreExtrasProvider } from '@/components/atlas/explore-extras';
import { JoaoComment, JoaoLinesProvider } from '@/components/atlas/joao-panel';
import { LiveWeatherPanel } from '@/components/atlas/live-weather';
import { BoundarySummary } from '@/components/boundary/boundary-summary';
import { GeoJsonImport } from '@/components/boundary/geojson-import';
import { analyzeBoundary } from '@/lib/engine/boundary-context';
import { ChatDemo } from '@/components/chat/chat-demo';
import { ClientOnly } from '@/components/client-only';
import type * as Leaflet from 'leaflet';
import { FarmWeatherFx, parseSim } from '@/components/atlas/farm-weather-fx';
import { PixelClimateHud } from '@/components/atlas/pixel-climate-hud';
import { useLocale } from '@/components/locale-provider';

type Climate = Extract<ClimateApiResponse, { status: 'ok' }>;
type ClimateState = { kind: 'idle' } | { kind: 'loading' } | { kind: 'ready'; data: Climate } | { kind: 'error'; message: string };
const MONTHS = { 'pt-BR': ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'], en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] } as const;
const oneDecimal = (value: number, en: boolean) => value.toLocaleString(en ? 'en-US' : 'pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
/** Opening view: a farming hub in western Bahia, so the page is never empty. */
const BAHIA: AtlasPoint = { label: 'Luís Eduardo Magalhães (BA)', latitude: -12.1979, longitude: -46.0192 };
const coordinateLabel = (point: AtlasPoint) => `${point.latitude.toFixed(4)}, ${point.longitude.toFixed(4)}`;

export function LocationExplorer() {
  const { locale } = useLocale();
  const en = locale === 'en';
  // Hidden demo switch: /explore?simular=vento|chuva|calor|nuvens|calmo forces a farm weather effect regardless of the real weather.
  const simParam = useSearchParams().get('simular');
  const fxSim = parseSim(simParam);
  const [point, setPoint] = useState<AtlasPoint | null>(BAHIA);
  const [latitude, setLatitude] = useState(String(BAHIA.latitude));
  const [longitude, setLongitude] = useState(String(BAHIA.longitude));
  const [state, setState] = useState<ClimateState>({ kind: 'loading' });
  // The opening view (Bahia) is not shown to the chat: only a place the user actually picks is offered, so the chat is not nagged on load.
  const [picked, setPicked] = useState(false);
  const [polygon, setPolygon] = useState<AtlasPolygon>([]);
  const [drawingPolygon, setDrawingPolygon] = useState(false);
  const polygonBeforeDrawing = useRef<AtlasPolygon>([]);
  const startDrawing = () => { polygonBeforeDrawing.current = polygon; setPolygon([]); setDrawingPolygon(true); };
  const finishDrawing = () => { if (polygon.length < 3) setPolygon(polygonBeforeDrawing.current); setDrawingPolygon(false); };
  const cancelDrawing = () => { setPolygon(polygonBeforeDrawing.current); setDrawingPolygon(false); };
  const [layers, setLayers] = useState<MapLayers>({ smap: false, rain: false, modis: false });
  const [leafletMap, setLeafletMap] = useState<Leaflet.Map | null>(null);
  const requestId = useRef(0);
  const live = useLiveWeather(point);
  // The side column holds two views of the same place: the data (with João's comments) and the chat with João. Both stay mounted, so a conversation is never lost when switching.
  const [tab, setTab] = useState<'data' | 'chat'>('data');
  const sideRef = useRef<HTMLDivElement>(null);
  const scrollToSide = useRef(false);

  const settle = useCallback((next: AtlasPoint) => {
    const id = ++requestId.current;
    return requestClimate(next, en).then((data) => { if (id === requestId.current) setState({ kind: 'ready', data }); }, (error: unknown) => { if (id === requestId.current) setState({ kind: 'error', message: error instanceof Error ? error.message : en ? 'Could not load NASA POWER data.' : 'Não foi possível carregar dados NASA POWER.' }); });
  }, [en]);
  const fetchClimate = useCallback((next: AtlasPoint) => { setState({ kind: 'loading' }); return settle(next); }, [settle]);
  // Opening view: Bahia is already selected (state starts as "loading") and its climate loads right away.
  useEffect(() => { void settle(BAHIA); }, [settle]);
  // On narrow screens the side column sits below the map: after a city search, bring it into view once its data has loaded.
  useEffect(() => {
    if (state.kind !== 'ready' || !scrollToSide.current) return;
    scrollToSide.current = false;
    if (!window.matchMedia('(max-width: 1023px)').matches) return;
    sideRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }, [state]);

  const setSelectedPoint = useCallback((next: AtlasPoint) => {
    setPicked(true); setPoint(next); setLatitude(String(next.latitude)); setLongitude(String(next.longitude)); void fetchClimate(next);
    // A point picked on the map has no name yet: ask which municipality contains it.
    if (!next.label) void fetch(`/api/places?lat=${next.latitude}&lon=${next.longitude}`).then((response) => response.json() as Promise<{ status: string; municipality?: { name: string; uf: string } | null }>).then((body) => {
      const found = body.status === 'ok' ? body.municipality : null;
      if (found) setPoint((current) => current && current.latitude === next.latitude && current.longitude === next.longitude ? { ...current, label: `${found.name} (${found.uf})` } : current);
    }).catch(() => { /* the point simply keeps showing coordinates */ });
  }, [fetchClimate]);
  const pickPlace = (place: PlaceMatch) => { scrollToSide.current = true; setSelectedPoint({ latitude: place.latitude, longitude: place.longitude, label: `${place.name} (${place.uf})` }); };
  const importBoundary = (boundary: AtlasPolygon) => { setPolygon(boundary); setDrawingPolygon(false); const center = analyzeBoundary(boundary).centroid; if (center) setSelectedPoint({ latitude: Number(center.latitude.toFixed(6)), longitude: Number(center.longitude.toFixed(6)) }); };
  const submitCoordinates = () => { const parsed = atlasPointSchema.safeParse({ latitude: Number(latitude), longitude: Number(longitude) }); if (!parsed.success) { setState({ kind: 'error', message: en ? 'Enter latitude between −90 and 90 and longitude between −180 and 180.' : 'Informe latitude entre −90 e 90 e longitude entre −180 e 180.' }); return; } setSelectedPoint(parsed.data); };
  const chatLoading = <p className="text-slate-300" role="status">Carregando conversa… / Loading chat…</p>;
  return <section className="grid gap-4">
    <PlaceSearch onPick={pickPlace} />
    <div className="atlas-layout-d">
      <div className="relative">
        <WorldMap point={point} polygon={polygon} drawingPolygon={drawingPolygon} layers={layers} onPointChange={setSelectedPoint} onPolygonChange={setPolygon} onDrawFinish={finishDrawing} onMapReady={setLeafletMap} pointZoom={typeof window !== 'undefined' && window.innerWidth < 640 ? 14 : 15} />
        {point ? <MapOverlay coordinates={coordinateLabel(point)} layers={layers} name={point.label ?? (en ? 'Point on the map' : 'Ponto no mapa')} onToggle={(layer) => setLayers((current) => ({ ...current, [layer]: !current[layer] }))} /> : null}
        <FarmWeatherFx drawing={drawingPolygon} en={en} live={live} map={leafletMap} onDraw={startDrawing} point={point} polygon={polygon} sim={fxSim} />{drawingPolygon ? <DrawToolbar count={polygon.length} en={en} onCancel={cancelDrawing} onFinish={finishDrawing} onUndo={() => setPolygon((current) => current.slice(0, -1))} /> : <PixelClimateHud en={en} onRetry={() => { if (point) void fetchClimate(point); }} state={state} />}
      </div>
      <div className="atlas-side-col" ref={sideRef}>
        <div aria-label={en ? 'Side panel' : 'Painel lateral'} className="flex gap-2" role="tablist">
          {([['data', en ? 'Data' : 'Dados'], ['chat', en ? 'Chat with João' : 'Conversa com o João']] as const).map(([id, label]) => <button aria-selected={tab === id} className={`min-h-11 flex-1 rounded-lg border px-3 text-sm font-semibold ${tab === id ? 'border-lime-300 bg-lime-300 text-slate-950' : 'border-slate-600 text-slate-100 hover:border-lime-300'}`} key={id} onClick={() => setTab(id)} role="tab" type="button">{label}</button>)}
        </div>
        <div className="atlas-side-body">
      <ExploreExtrasProvider point={point}>
        <aside aria-live="polite" className={`atlas-panel ${tab === 'data' ? '' : 'hidden'}`}>
          {!point ? <p className="text-slate-300">{en ? 'Search a city or tap the map.' : 'Busque uma cidade ou toque no mapa.'}</p> : <>
            <h2 className="text-2xl font-bold leading-tight">{point.label ?? (en ? 'Point on the map' : 'Ponto no mapa')}</h2>
            <p className="mt-1 font-mono text-xs text-slate-400">{coordinateLabel(point)}</p>
            {state.kind === 'loading' ? <PanelSkeleton label={en ? 'Loading NASA climate history…' : 'Buscando o histórico climático da NASA…'} /> : null}
            {state.kind === 'error' ? <div className="mt-5 rounded-lg border border-amber-300/50 bg-amber-950/30 p-3"><p className="flex gap-2 text-amber-100"><AlertCircle aria-hidden="true" className="mt-0.5 shrink-0" size={18} />{state.message}</p><Button className="mt-3" type="button" variant="secondary" onClick={() => void fetchClimate(point)}><RefreshCw aria-hidden="true" size={16} />{en ? 'Try again' : 'Tentar novamente'}</Button></div> : null}
            {state.kind === 'ready' ? <JoaoLinesProvider climate={state.data} point={point}>
              <ClimateView data={state.data} en={en} />
              <PlantingPanels data={state.data} en={en} />
            </JoaoLinesProvider> : null}
            <LiveWeatherPanel state={live} />
            <Button className="mt-6 w-full justify-center" type="button" onClick={() => setTab('chat')}><MessageCircle aria-hidden="true" className="mr-2" size={18} />{en ? 'Talk to João about my farm' : 'Conversar com o João sobre a minha fazenda'}</Button>
          </>}
        </aside>
      </ExploreExtrasProvider>
          <div className={`atlas-chat-col ${tab === 'chat' ? '' : 'hidden'}`}><Suspense fallback={chatLoading}><ClientOnly fallback={chatLoading}><ChatDemo mapPoint={picked ? point : null} mapPolygon={polygon} /></ClientOnly></Suspense></div>
        </div>
      </div>

    </div>
    <details className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
      <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold"><SlidersHorizontal aria-hidden="true" size={16} />{en ? 'More options' : 'Mais opções'}</summary>
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]"><label className="text-sm">Latitude<input aria-label="Latitude" className="mt-1 block w-full rounded-lg border border-slate-600 bg-slate-950 p-2.5" inputMode="decimal" value={latitude} onChange={(event) => setLatitude(event.target.value)} /></label><label className="text-sm">Longitude<input aria-label="Longitude" className="mt-1 block w-full rounded-lg border border-slate-600 bg-slate-950 p-2.5" inputMode="decimal" value={longitude} onChange={(event) => setLongitude(event.target.value)} /></label><Button className="self-end" type="button" onClick={submitCoordinates}>{en ? 'Go to point' : 'Ir ao ponto'}</Button></div>
      <div aria-label={en ? 'Location examples' : 'Exemplos de localidade'} className="mt-3 flex flex-wrap gap-2">{ATLAS_EXAMPLES.map((example) => <Button key={example.label} type="button" variant="secondary" onClick={() => setSelectedPoint(example)}>{example.label}</Button>)}</div>
      <div className="mt-4 flex flex-wrap gap-2"><Button aria-pressed={drawingPolygon} type="button" variant="secondary" onClick={() => (drawingPolygon ? finishDrawing() : startDrawing())}><Pentagon aria-hidden="true" size={16} />{drawingPolygon ? (en ? 'Finish area' : 'Encerrar área') : (en ? 'Draw exploratory area' : 'Desenhar área exploratória')}</Button>{polygon.length ? <Button type="button" variant="secondary" onClick={() => { setPolygon([]); setDrawingPolygon(false); }}>{en ? 'Clear area' : 'Limpar área'}</Button> : null}<GeoJsonImport onImport={importBoundary} /></div>
      {drawingPolygon ? <p className="mt-3 text-sm text-lime-100" role="status">{en ? `Click the map to add vertices (${polygon.length}). Finish after at least 3.` : `Clique no mapa para adicionar vértices (${polygon.length}). Encerre após pelo menos 3.`}</p> : null}
      {polygon.length >= 3 ? <div className="mt-3"><BoundarySummary boundary={polygon} compact /><p className="mt-2 text-xs text-slate-400">{en ? 'Exploratory boundary (drawn or imported); it does not confirm ownership, land use, or a registered field.' : 'Limite exploratório (desenhado ou importado); não confirma propriedade, uso agrícola ou talhão cadastrado.'}</p></div> : null}
    </details>
    <p className="text-xs text-slate-400">{en ? 'Historical NASA POWER climate. Not a forecast or an agronomic recommendation.' : 'Clima histórico NASA POWER. Não é previsão nem recomendação agronômica.'} <Link className="underline" href="/methodology">{en ? 'How it works' : 'Como funciona'}</Link></p>
  </section>;
}

/** Placeholder blocks with the shape of the results, so the panel does not jump when the data arrives. */
function PanelSkeleton({ label }: { label: string }) {
  const block = 'rounded-lg bg-slate-800/70 motion-reduce:animate-none animate-pulse';
  return <div aria-live="polite" className="mt-5" role="status"><p className="text-sm text-slate-300">{label}</p><div aria-hidden="true" className="mt-3 grid gap-2"><div className="grid grid-cols-2 gap-2"><div className={`${block} h-16`} /><div className={`${block} h-16`} /></div><div className={`${block} h-44`} /><div className="grid grid-cols-2 gap-2"><div className={`${block} h-12`} /><div className={`${block} h-12`} /></div></div></div>;
}

function ClimateView({ data, en }: { data: Climate; en: boolean }) {
  const names = MONTHS[en ? 'en' : 'pt-BR'];
  const currentMonth = new Date().getMonth() + 1;
  const rain = new Map(data.climateSummary.historicalPrecipitationByMonth.map((item) => [item.month, item.medianTotalMm]));
  const points: MonthPoint[] = Array.from({ length: 12 }, (_, index) => { const month = index + 1; const item = data.climateSummary.monthly.find((entry) => entry.month === month); const prev = data.climateSummary.lastYear?.months.find((entry) => entry.month === month); return { month, rainMm: rain.get(month) ?? null, tempC: item?.tmeanMedianC ?? null, prevRainMm: prev?.rainTotalMm ?? null, prevTempC: prev?.tmeanMedianC ?? null }; });
  const previousYear = data.climateSummary.lastYear?.year;
  const history = `${data.provenance.period.start.slice(0, 4)}–${data.provenance.period.end.slice(0, 4)}`;
  const now = points[currentMonth - 1];
  const wet = points.filter((p) => p.rainMm !== null).sort((a, b) => (b.rainMm ?? 0) - (a.rainMm ?? 0));
  const hot = points.filter((p) => p.tempC !== null).sort((a, b) => (b.tempC ?? 0) - (a.tempC ?? 0));
  const fact = (label: string, value: string) => <div className="rounded-lg bg-slate-950/60 p-3"><dt className="text-xs text-slate-400">{label}</dt><dd className="mt-0.5 font-semibold">{value}</dd></div>;
  return <div className="mt-5">
    <p className="text-sm font-semibold text-lime-200">{en ? `Typical in ${names[currentMonth - 1]}` : `Típico em ${names[currentMonth - 1]}`}</p>
    <dl className="mt-2 grid grid-cols-2 gap-2">
      <div className="rounded-lg border border-cyan-300/30 bg-slate-950/60 p-3"><dt className="text-xs text-slate-400">{en ? 'Temperature' : 'Temperatura'}</dt><dd className="mt-0.5 text-2xl font-bold text-cyan-200">{now.tempC === null ? 'N/D' : `${oneDecimal(now.tempC, en)} °C`}</dd></div>
      <div className="rounded-lg border border-cyan-300/30 bg-slate-950/60 p-3"><dt className="text-xs text-slate-400">{en ? 'Rain in the month' : 'Chuva no mês'}</dt><dd className="mt-0.5 text-2xl font-bold text-cyan-200">{now.rainMm === null ? 'N/D' : `${Math.round(now.rainMm)} mm`}</dd></div>
    </dl>
    <div className="mt-5"><MonthlyChart currentMonth={currentMonth} history={en ? `median ${history}` : `mediana ${history}`} points={points} previousYear={previousYear} /></div>
    {wet.length >= 2 || hot.length >= 2 ? <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
      {wet.length >= 2 ? fact(en ? 'Rainiest month' : 'Mês mais chuvoso', `${names[wet[0].month - 1]} · ${Math.round(wet[0].rainMm ?? 0)} mm`) : null}
      {wet.length >= 2 ? fact(en ? 'Driest month' : 'Mês mais seco', `${names[wet[wet.length - 1].month - 1]} · ${Math.round(wet[wet.length - 1].rainMm ?? 0)} mm`) : null}
      {hot.length >= 2 ? fact(en ? 'Warmest month' : 'Mês mais quente', `${names[hot[0].month - 1]} · ${oneDecimal(hot[0].tempC ?? 0, en)} °C`) : null}
      {hot.length >= 2 ? fact(en ? 'Coolest month' : 'Mês mais frio', `${names[hot[hot.length - 1].month - 1]} · ${oneDecimal(hot[hot.length - 1].tempC ?? 0, en)} °C`) : null}
    </dl> : null}
    <div className="mt-4 flex flex-col"><JoaoComment id="typical-month" /></div>
    <p className="mt-4 text-xs text-slate-400">NASA POWER · {data.provenance.period.start.slice(0, 4)}–{data.provenance.period.end.slice(0, 4)} · {en ? 'median of the historical years' : 'mediana dos anos históricos'}. <a className="underline" href={data.provenance.sourceUrl} rel="noreferrer" target="_blank">{en ? 'Source' : 'Fonte'}</a></p>
  </div>;
}


async function requestClimate(next: AtlasPoint, en: boolean): Promise<Climate> {
  const today = new Date();
  const query = `lat=${encodeURIComponent(next.latitude)}&lon=${encodeURIComponent(next.longitude)}&month=${today.getMonth() + 1}&day=${today.getDate()}`;
  const response = await fetch(`/api/climate?${query}`);
  const parsed = climateApiResponseSchema.safeParse(await response.json());
  if (!parsed.success) throw new Error(en ? 'Invalid climate response.' : 'Resposta climática inválida.');
  if (parsed.data.status === 'error') throw new Error(parsed.data.message);
  return parsed.data;
}

function DrawToolbar({ count, en, onUndo, onFinish, onCancel }: { count: number; en: boolean; onUndo: () => void; onFinish: () => void; onCancel: () => void }) {
  const ready = count >= 3;
  const button = 'border-2 px-3 py-1.5 font-mono text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40';
  return <div className="absolute left-3 right-14 bottom-8 z-[1000] mx-auto flex w-fit flex-wrap items-center justify-center gap-2 border-2 border-lime-300 bg-slate-950/90 p-2 shadow-[4px_4px_0_0_rgba(0,0,0,0.6)]" role="toolbar" aria-label={en ? 'Area drawing' : 'Desenho da área'}>
    <p className="px-1 font-mono text-xs text-lime-100" role="status">{ready ? (en ? `${count} vertices · click the first one or Finish` : `${count} vértices · clique no primeiro ou em Concluir`) : (en ? `Click the map to add vertices (${count}/3)` : `Clique no mapa para marcar os vértices (${count}/3)`)}</p>
    <button className={`${button} border-slate-500 text-slate-100`} disabled={count === 0} type="button" onClick={onUndo}>{en ? 'Undo' : 'Desfazer'}</button>
    <button className={`${button} border-lime-300 bg-lime-300 text-slate-950`} disabled={!ready} type="button" onClick={onFinish}>{en ? 'Finish' : 'Concluir'}</button>
    <button className={`${button} border-slate-500 text-slate-100`} type="button" onClick={onCancel}>{en ? 'Cancel' : 'Cancelar'}</button>
  </div>;
}
