'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type * as Leaflet from 'leaflet';
import { useSearchParams } from 'next/navigation';
import { Pentagon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ClientOnly } from '@/components/client-only';
import { useLocale } from '@/components/locale-provider';
import { WorldMap } from '@/components/atlas/world-map';
import { MapOverlay } from '@/components/atlas/map-overlay';
import { useLiveWeather } from '@/components/atlas/use-live-weather';
import { FarmWeatherFx, parseSim } from '@/components/atlas/farm-weather-fx';
import { PixelClimateHud } from '@/components/atlas/pixel-climate-hud';
import { DrawToolbar, type Climate } from '@/components/atlas/location-explorer';
import type { AtlasPoint, AtlasPolygon, MapLayers } from '@/lib/atlas';

type HudState = { kind: 'idle' } | { kind: 'loading' } | { kind: 'ready'; data: Climate } | { kind: 'error'; message: string };
const MAP_HEIGHT = 'h-[26rem] lg:h-[32rem]';
const coordinateLabel = (point: AtlasPoint) => `${point.latitude.toFixed(4)}, ${point.longitude.toFixed(4)}`;

/** The explore-style map (satellite, live weather effects, climate HUD, layer overlay) framed on the farm perimeter, with perimeter editing. */
export function FarmMap({ point, polygon: savedPolygon, polygonOrigin, onSavePolygon, className, climate = { kind: 'loading' }, onRetryClimate }: {
  point: AtlasPoint; polygon: AtlasPolygon; polygonOrigin?: 'suggested' | 'drawn'; onSavePolygon: (polygon: AtlasPolygon) => Promise<boolean>; className?: string;
  /** Climate of the place for the HUD; the parent already loads it. */
  climate?: HudState; onRetryClimate?: () => void;
}) {
  const { locale } = useLocale();
  const en = locale === 'en';
  const fxSim = parseSim(useSearchParams().get('simular'));
  const live = useLiveWeather(point);
  const [layers, setLayers] = useState<MapLayers>({ smap: false, rain: false, modis: false });
  const [map, setMap] = useState<Leaflet.Map | null>(null);
  const [polygon, setPolygon] = useState<AtlasPolygon>(savedPolygon);
  const [drawing, setDrawing] = useState(false);
  const [edited, setEdited] = useState(false);
  const [saving, setSaving] = useState<{ kind: 'idle' | 'saving' | 'saved' } | { kind: 'error'; message: string }>({ kind: 'idle' });
  const polygonBeforeDrawing = useRef<AtlasPolygon>([]);
  const [lastSaved, setLastSaved] = useState(savedPolygon);

  // Follow the saved perimeter when the server data changes (after refresh).
  if (lastSaved !== savedPolygon && !drawing) { setLastSaved(savedPolygon); setPolygon(savedPolygon); }

  const startDrawing = () => { polygonBeforeDrawing.current = polygon; setPolygon([]); setDrawing(true); setSaving({ kind: 'idle' }); };
  const cancelDrawing = () => { setPolygon(polygonBeforeDrawing.current); setDrawing(false); };
  const finishDrawing = async () => {
    if (polygon.length < 3) { cancelDrawing(); return; }
    setDrawing(false); setSaving({ kind: 'saving' });
    const ok = await onSavePolygon(polygon).catch(() => false);
    if (ok) { setSaving({ kind: 'saved' }); setEdited(true); return; }
    setPolygon(polygonBeforeDrawing.current);
    setSaving({ kind: 'error', message: en ? 'Could not save the perimeter. Try again.' : 'Não foi possível salvar o perímetro. Tente de novo.' });
  };

  // Frame the farm perimeter once the map is ready.
  const hasSaved = savedPolygon.length >= 3;
  const fitTarget = useMemo(() => savedPolygon.map(([lng, lat]) => [lat, lng] as [number, number]), [savedPolygon]);
  useEffect(() => {
    if (!map || drawing || !hasSaved) return;
    const timer = window.setTimeout(() => map.fitBounds(fitTarget, { maxZoom: 16, padding: [24, 24], animate: false }), 400);
    return () => window.clearTimeout(timer);
  }, [map, fitTarget, hasSaved, drawing]);

  const suggested = polygonOrigin === 'suggested' && !edited && !drawing;
  const placeholder = <div className={`${MAP_HEIGHT} bg-slate-900`} />;
  return <div className={`overflow-hidden rounded-2xl border border-slate-700 ${className ?? ''}`}>
    <ClientOnly fallback={placeholder}>
      <div className={`relative ${MAP_HEIGHT} [&_.atlas-map]:h-full [&_.atlas-map-frame]:h-full [&_.atlas-map-frame]:min-h-0`}>
        <WorldMap drawingPolygon={drawing} layers={layers} onDrawFinish={() => void finishDrawing()} onMapReady={setMap} onPointChange={() => undefined} onPolygonChange={setPolygon} point={point} pointZoom={14} polygon={polygon} />
        <MapOverlay coordinates={coordinateLabel(point)} layers={layers} name={point.label ?? (en ? 'Point on the map' : 'Ponto no mapa')} onToggle={(layer) => setLayers((current) => ({ ...current, [layer]: !current[layer] }))} />
        <FarmWeatherFx drawing={drawing} en={en} live={live} map={map} onDraw={startDrawing} point={point} polygon={polygon} sim={fxSim} />
        {drawing ? <DrawToolbar count={polygon.length} en={en} onCancel={cancelDrawing} onFinish={() => void finishDrawing()} onUndo={() => setPolygon((current) => current.slice(0, -1))} /> : <PixelClimateHud en={en} onRetry={onRetryClimate ?? (() => undefined)} state={climate} />}
        {suggested ? <p className="pointer-events-none absolute left-3 top-3 z-[1000] max-w-[70%] border-2 border-lime-300 bg-slate-950/90 px-2 py-1 font-mono text-xs text-lime-100 shadow-[3px_3px_0_0_rgba(0,0,0,0.6)]" role="status">{en ? 'Suggested area · tap Edit perimeter to adjust' : 'Área sugerida · toque em Editar perímetro para ajustar'}</p> : null}
      </div>
    </ClientOnly>
    <div className="flex flex-wrap items-center gap-2 border-t border-slate-700 bg-slate-900/70 p-3">
      {drawing
        ? <p className="text-sm text-lime-100" role="status">{en ? `Click the map to add vertices (${polygon.length}). Finish after at least 3.` : `Clique no mapa para adicionar vértices (${polygon.length}). Conclua após pelo menos 3.`}</p>
        : <Button disabled={saving.kind === 'saving'} onClick={startDrawing} type="button" variant="secondary"><Pentagon aria-hidden="true" className="mr-2" size={16} />{hasSaved ? (en ? 'Edit perimeter' : 'Editar perímetro') : (en ? 'Draw perimeter' : 'Desenhar perímetro')}</Button>}
      {saving.kind === 'saving' ? <p className="text-sm text-slate-300" role="status">{en ? 'Saving…' : 'Salvando…'}</p> : null}
      {saving.kind === 'saved' ? <p className="text-sm text-lime-200" role="status">{en ? 'Perimeter saved.' : 'Perímetro salvo.'}</p> : null}
      {saving.kind === 'error' ? <p className="text-sm text-amber-100" role="alert">{saving.message}</p> : null}
    </div>
  </div>;
}
