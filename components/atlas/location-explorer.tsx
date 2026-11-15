'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Pentagon, SlidersHorizontal } from 'lucide-react';
import { atlasPointSchema, ATLAS_EXAMPLES, climateApiResponseSchema, type AtlasPoint, type AtlasPolygon, type ClimateApiResponse, type MapLayers } from '@/lib/atlas';
import type { PlaceMatch } from '@/lib/brazil/places';
import { Button } from '@/components/ui/button';
import { WorldMap } from '@/components/atlas/world-map';
import { MapOverlay } from '@/components/atlas/map-overlay';
import { useLiveWeather } from '@/components/atlas/use-live-weather';
import { PlaceSearch } from '@/components/atlas/place-search';
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
  const [polygon, setPolygon] = useState<AtlasPolygon>([]);
  const [drawingPolygon, setDrawingPolygon] = useState(false);
  const [layers, setLayers] = useState<MapLayers>({ smap: false, rain: false, modis: false });
  const [leafletMap, setLeafletMap] = useState<Leaflet.Map | null>(null);
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
  const chatLoading = <p className="text-slate-300" role="status">Carregando conversa… / Loading chat…</p>;
  return <section className="grid gap-4">
    <PlaceSearch onPick={pickPlace} />
    <div className="atlas-layout-d">
      <div className="relative">
        <WorldMap point={point} polygon={polygon} drawingPolygon={drawingPolygon} layers={layers} onPointChange={setSelectedPoint} onPolygonChange={setPolygon} onMapReady={setLeafletMap} pointZoom={typeof window !== 'undefined' && window.innerWidth < 640 ? 14 : 15} />
        {point ? <MapOverlay coordinates={coordinateLabel(point)} layers={layers} name={point.label ?? (en ? 'Point on the map' : 'Ponto no mapa')} onToggle={(layer) => setLayers((current) => ({ ...current, [layer]: !current[layer] }))} /> : null}
        <FarmWeatherFx drawing={drawingPolygon} en={en} live={live} map={leafletMap} onDraw={() => setDrawingPolygon(true)} point={point} polygon={polygon} sim={fxSim} /><PixelClimateHud en={en} onRetry={() => { if (point) void fetchClimate(point); }} state={state} />
      </div>
      <div className="atlas-chat-col"><Suspense fallback={chatLoading}><ClientOnly fallback={chatLoading}><ChatDemo /></ClientOnly></Suspense></div>
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

async function requestClimate(next: AtlasPoint, en: boolean): Promise<Climate> {
  const today = new Date();
  const query = `lat=${encodeURIComponent(next.latitude)}&lon=${encodeURIComponent(next.longitude)}&month=${today.getMonth() + 1}&day=${today.getDate()}`;
  const response = await fetch(`/api/climate?${query}`);
  const parsed = climateApiResponseSchema.safeParse(await response.json());
  if (!parsed.success) throw new Error(en ? 'Invalid climate response.' : 'Resposta climática inválida.');
  if (parsed.data.status === 'error') throw new Error(parsed.data.message);
  return parsed.data;
}
