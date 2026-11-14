'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowRight, RefreshCw, Pentagon, SlidersHorizontal } from 'lucide-react';
import { atlasPointSchema, ATLAS_EXAMPLES, climateApiResponseSchema, type AtlasPoint, type AtlasPolygon, type ClimateApiResponse, type MapLayers } from '@/lib/atlas';
import type { PlaceMatch } from '@/lib/brazil/places';
import { Button } from '@/components/ui/button';
import { WorldMap } from '@/components/atlas/world-map';
import { MapOverlay } from '@/components/atlas/map-overlay';
import { LiveStrip, LiveWeatherPanel } from '@/components/atlas/live-weather';
import { useLiveWeather } from '@/components/atlas/use-live-weather';
import { PlaceSearch } from '@/components/atlas/place-search';
import { MonthlyChart, type MonthPoint } from '@/components/atlas/monthly-chart';
import { BoundarySummary } from '@/components/boundary/boundary-summary';
import { GeoJsonImport } from '@/components/boundary/geojson-import';
import { analyzeBoundary } from '@/lib/engine/boundary-context';
import { useLocale } from '@/components/locale-provider';

type Climate = Extract<ClimateApiResponse, { status: 'ok' }>;
type ClimateState = { kind: 'idle' } | { kind: 'loading' } | { kind: 'ready'; data: Climate } | { kind: 'error'; message: string };
const MONTHS = { 'pt-BR': ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'], en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] } as const;
/** Opening view: a farming hub in western Bahia, so the page is never empty. */
const BAHIA: AtlasPoint = { label: 'Luís Eduardo Magalhães (BA)', latitude: -12.1979, longitude: -46.0192 };
const coordinateLabel = (point: AtlasPoint) => `${point.latitude.toFixed(4)}, ${point.longitude.toFixed(4)}`;

export function LocationExplorer() {
  const { locale } = useLocale();
  const en = locale === 'en';
  const router = useRouter();
  const [point, setPoint] = useState<AtlasPoint | null>(BAHIA);
  const [latitude, setLatitude] = useState(String(BAHIA.latitude));
  const [longitude, setLongitude] = useState(String(BAHIA.longitude));
  const [state, setState] = useState<ClimateState>({ kind: 'loading' });
  const [polygon, setPolygon] = useState<AtlasPolygon>([]);
  const [drawingPolygon, setDrawingPolygon] = useState(false);
  const [layers, setLayers] = useState<MapLayers>({ smap: false, rain: false, modis: false });
  const requestId = useRef(0);
  const live = useLiveWeather(point);

  const settle = useCallback((next: AtlasPoint) => {
    const id = ++requestId.current;
    return requestClimate(next, en).then((data) => { if (id === requestId.current) setState({ kind: 'ready', data }); }, (error: unknown) => { if (id === requestId.current) setState({ kind: 'error', message: error instanceof Error ? error.message : en ? 'Could not load NASA POWER data.' : 'Não foi possível carregar dados NASA POWER.' }); });
  }, [en]);
  const fetchClimate = useCallback((next: AtlasPoint) => { setState({ kind: 'loading' }); return settle(next); }, [settle]);
  // Opening view: Bahia is already selected (state starts as "loading") and its climate loads right away.
  useEffect(() => { void settle(BAHIA); }, [settle]);

  const setSelectedPoint = useCallback((next: AtlasPoint) => {
    setPoint(next); setLatitude(String(next.latitude)); setLongitude(String(next.longitude)); void fetchClimate(next);
    // A point picked on the map has no name yet: ask which municipality contains it.
    if (!next.label) void fetch(`/api/places?lat=${next.latitude}&lon=${next.longitude}`).then((response) => response.json() as Promise<{ status: string; municipality?: { name: string; uf: string } | null }>).then((body) => {
      const found = body.status === 'ok' ? body.municipality : null;
      if (found) setPoint((current) => current && current.latitude === next.latitude && current.longitude === next.longitude ? { ...current, label: `${found.name} (${found.uf})` } : current);
    }).catch(() => { /* the point simply keeps showing coordinates */ });
  }, [fetchClimate]);
  const pickPlace = (place: PlaceMatch) => setSelectedPoint({ latitude: place.latitude, longitude: place.longitude, label: `${place.name} (${place.uf})` });
  const importBoundary = (boundary: AtlasPolygon) => { setPolygon(boundary); setDrawingPolygon(false); const center = analyzeBoundary(boundary).centroid; if (center) setSelectedPoint({ latitude: Number(center.latitude.toFixed(6)), longitude: Number(center.longitude.toFixed(6)) }); };
  const submitCoordinates = () => { const parsed = atlasPointSchema.safeParse({ latitude: Number(latitude), longitude: Number(longitude) }); if (!parsed.success) { setState({ kind: 'error', message: en ? 'Enter latitude between −90 and 90 and longitude between −180 and 180.' : 'Informe latitude entre −90 e 90 e longitude entre −180 e 180.' }); return; } setSelectedPoint(parsed.data); };
  const registerFarm = () => {
    if (!point) return;
    window.localStorage.setItem('field-shift:atlas-point', JSON.stringify(point));
    if (polygon.length >= 3) window.localStorage.setItem('field-shift:atlas-polygon', JSON.stringify(polygon));
    router.push(`/chat?lat=${encodeURIComponent(point.latitude)}&lon=${encodeURIComponent(point.longitude)}&label=${encodeURIComponent(point.label ?? coordinateLabel(point))}`);
  };

  return <section className="grid gap-4">
    <PlaceSearch onPick={pickPlace} />
    <div className="atlas-layout">
      <div className="relative">
        <WorldMap point={point} polygon={polygon} drawingPolygon={drawingPolygon} layers={layers} onPointChange={setSelectedPoint} onPolygonChange={setPolygon} />
        {point ? <MapOverlay live={<LiveStrip state={live} />} coordinates={coordinateLabel(point)} layers={layers} name={point.label ?? (en ? 'Point on the map' : 'Ponto no mapa')} onToggle={(layer) => setLayers((current) => ({ ...current, [layer]: !current[layer] }))} /> : null}
      </div>
      <aside aria-live="polite" className="atlas-panel">
        {!point ? <p className="text-slate-300">{en ? 'Search a city or tap the map.' : 'Busque uma cidade ou toque no mapa.'}</p> : <>
          <h2 className="text-2xl font-bold leading-tight">{point.label ?? (en ? 'Point on the map' : 'Ponto no mapa')}</h2>
          <p className="mt-1 font-mono text-xs text-slate-400">{coordinateLabel(point)}</p>
          {state.kind === 'loading' ? <p className="mt-5 text-slate-300" role="status">{en ? 'Loading NASA climate history…' : 'Buscando o histórico climático da NASA…'}</p> : null}
          {state.kind === 'error' ? <div className="mt-5 rounded-lg border border-amber-300/50 bg-amber-950/30 p-3"><p className="flex gap-2 text-amber-100"><AlertCircle aria-hidden="true" className="mt-0.5 shrink-0" size={18} />{state.message}</p><Button className="mt-3" type="button" variant="secondary" onClick={() => void fetchClimate(point)}><RefreshCw aria-hidden="true" size={16} />{en ? 'Try again' : 'Tentar novamente'}</Button></div> : null}
          {state.kind === 'ready' ? <ClimateView data={state.data} en={en} /> : null}
          <LiveWeatherPanel state={live} />
          <Button className="mt-6 w-full justify-center" type="button" onClick={registerFarm}>{en ? 'Register my farm here' : 'Cadastrar minha fazenda aqui'}<ArrowRight aria-hidden="true" className="ml-2" size={18} /></Button>
        </>}
      </aside>
    </div>
    <details className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
      <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold"><SlidersHorizontal aria-hidden="true" size={16} />{en ? 'More options' : 'Mais opções'}</summary>
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]"><label className="text-sm">Latitude<input aria-label="Latitude" className="mt-1 block w-full rounded-lg border border-slate-600 bg-slate-950 p-2.5" inputMode="decimal" value={latitude} onChange={(event) => setLatitude(event.target.value)} /></label><label className="text-sm">Longitude<input aria-label="Longitude" className="mt-1 block w-full rounded-lg border border-slate-600 bg-slate-950 p-2.5" inputMode="decimal" value={longitude} onChange={(event) => setLongitude(event.target.value)} /></label><Button className="self-end" type="button" onClick={submitCoordinates}>{en ? 'Go to point' : 'Ir ao ponto'}</Button></div>
      <div aria-label={en ? 'Location examples' : 'Exemplos de localidade'} className="mt-3 flex flex-wrap gap-2">{ATLAS_EXAMPLES.map((example) => <Button key={example.label} type="button" variant="secondary" onClick={() => setSelectedPoint(example)}>{example.label}</Button>)}</div>
      <div className="mt-4 flex flex-wrap gap-2"><Button aria-pressed={drawingPolygon} type="button" variant="secondary" onClick={() => setDrawingPolygon((drawing) => !drawing)}><Pentagon aria-hidden="true" size={16} />{drawingPolygon ? (en ? 'Finish area' : 'Encerrar área') : (en ? 'Draw exploratory area' : 'Desenhar área exploratória')}</Button>{polygon.length ? <Button type="button" variant="secondary" onClick={() => { setPolygon([]); setDrawingPolygon(false); }}>{en ? 'Clear area' : 'Limpar área'}</Button> : null}<GeoJsonImport onImport={importBoundary} /></div>
      {drawingPolygon ? <p className="mt-3 text-sm text-lime-100" role="status">{en ? `Click the map to add vertices (${polygon.length}). Finish after at least 3.` : `Clique no mapa para adicionar vértices (${polygon.length}). Encerre após pelo menos 3.`}</p> : null}
      {polygon.length >= 3 ? <div className="mt-3"><BoundarySummary boundary={polygon} compact /><p className="mt-2 text-xs text-slate-400">{en ? 'Exploratory boundary (drawn or imported); it does not confirm ownership, land use, or a registered field.' : 'Limite exploratório (desenhado ou importado); não confirma propriedade, uso agrícola ou talhão cadastrado.'}</p></div> : null}
    </details>
    <p className="text-xs text-slate-400">{en ? 'Historical NASA POWER climate. Not a forecast or an agronomic recommendation.' : 'Clima histórico NASA POWER. Não é previsão nem recomendação agronômica.'} <Link className="underline" href="/methodology">{en ? 'How it works' : 'Como funciona'}</Link></p>
  </section>;
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
      <div className="rounded-lg border border-cyan-300/30 bg-slate-950/60 p-3"><dt className="text-xs text-slate-400">{en ? 'Temperature' : 'Temperatura'}</dt><dd className="mt-0.5 text-2xl font-bold text-cyan-200">{now.tempC === null ? 'N/D' : `${now.tempC.toFixed(1)} °C`}</dd></div>
      <div className="rounded-lg border border-cyan-300/30 bg-slate-950/60 p-3"><dt className="text-xs text-slate-400">{en ? 'Rain in the month' : 'Chuva no mês'}</dt><dd className="mt-0.5 text-2xl font-bold text-cyan-200">{now.rainMm === null ? 'N/D' : `${Math.round(now.rainMm)} mm`}</dd></div>
    </dl>
    <div className="mt-5"><MonthlyChart currentMonth={currentMonth} history={en ? `median ${history}` : `mediana ${history}`} points={points} previousYear={previousYear} /></div>
    {wet.length >= 2 || hot.length >= 2 ? <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
      {wet.length >= 2 ? fact(en ? 'Rainiest month' : 'Mês mais chuvoso', `${names[wet[0].month - 1]} · ${Math.round(wet[0].rainMm ?? 0)} mm`) : null}
      {wet.length >= 2 ? fact(en ? 'Driest month' : 'Mês mais seco', `${names[wet[wet.length - 1].month - 1]} · ${Math.round(wet[wet.length - 1].rainMm ?? 0)} mm`) : null}
      {hot.length >= 2 ? fact(en ? 'Warmest month' : 'Mês mais quente', `${names[hot[0].month - 1]} · ${(hot[0].tempC ?? 0).toFixed(1)} °C`) : null}
      {hot.length >= 2 ? fact(en ? 'Coolest month' : 'Mês mais frio', `${names[hot[hot.length - 1].month - 1]} · ${(hot[hot.length - 1].tempC ?? 0).toFixed(1)} °C`) : null}
    </dl> : null}
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
