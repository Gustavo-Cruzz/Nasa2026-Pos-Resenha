'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { PixelAnimation } from '@/components/pixel/pixel-animation';
import type { AtlasPoint } from '@/lib/atlas';
import { fieldShiftMapStyle } from '@/lib/atlas-map-style';

type WorldMapProps = { point: AtlasPoint | null; onPointChange: (point: AtlasPoint) => void };

export function WorldMap({ point, onPointChange }: WorldMapProps) {
  const [mapError, setMapError] = useState<string>();
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<import('maplibre-gl').Map | null>(null);
  const marker = useRef<import('maplibre-gl').Marker | null>(null);
  const onPointChangeRef = useRef(onPointChange);
  const pointRef = useRef(point);
  useEffect(() => { onPointChangeRef.current = onPointChange; }, [onPointChange]);
  useEffect(() => { pointRef.current = point; if (point && map.current) { marker.current?.setLngLat([point.longitude, point.latitude]); map.current.flyTo({ center: [point.longitude, point.latitude], duration: 250 }); } }, [point]);

  useEffect(() => {
    if (!container.current) return;
    let disposed = false;
    void import('maplibre-gl').then((maplibregl) => {
      if (disposed || !container.current) return;
      const initial = pointRef.current;
      const instance = new maplibregl.Map({ container: container.current, style: fieldShiftMapStyle, center: initial ? [initial.longitude, initial.latitude] : [0, 15], zoom: initial ? 5 : 1.35, attributionControl: false });
      map.current = instance;
      const setMarker = (next: AtlasPoint) => {
        marker.current?.remove();
        const nextMarker = new maplibregl.Marker({ draggable: true }).setLngLat([next.longitude, next.latitude]).addTo(instance);
        marker.current = nextMarker;
        nextMarker.on('dragend', () => { const position = marker.current?.getLngLat(); if (position) onPointChangeRef.current({ latitude: Number(position.lat.toFixed(6)), longitude: Number(position.lng.toFixed(6)) }); });
      };
      instance.on('click', (event: import('maplibre-gl').MapMouseEvent) => { const next = { latitude: Number(event.lngLat.lat.toFixed(6)), longitude: Number(event.lngLat.lng.toFixed(6)) }; setMarker(next); onPointChangeRef.current(next); });
      instance.on('load', () => { void addNeutralTexture(instance, maplibregl).finally(() => { if (pointRef.current) setMarker(pointRef.current); }); });
    }).catch((error: unknown) => setMapError(error instanceof Error ? error.message : 'Não foi possível iniciar o mapa local.'));
    return () => { disposed = true; marker.current?.remove(); marker.current = null; map.current?.remove(); map.current = null; };
  }, []);

  return <div className="atlas-map-frame"><div className="atlas-map" ref={container} aria-label="Mapa mundial interativo; clique para escolher uma coordenada" />{mapError ? <p className="atlas-map-error" role="status">Mapa interativo indisponível neste navegador. Use latitude e longitude abaixo.</p> : null}<div aria-hidden="true" className="atlas-map-texture" /><div aria-hidden="true" className="atlas-map-animation atlas-map-orbit"><PixelAnimation fallback="/assets/nasa/earth-orbit-static.png" frameHeight={64} frameMs={180} frames={4} loop sheet="/assets/nasa/earth-orbit-sheet.png" size={64} /></div><div aria-hidden="true" className="atlas-map-animation atlas-map-satellite"><PixelAnimation fallback="/assets/nasa/satellite-static.png" frameMs={130} frames={6} loop sheet="/assets/nasa/satellite-sheet.png" size={32} /></div><div aria-hidden="true" className="atlas-map-animation atlas-map-pulse"><PixelAnimation fallback="/assets/nasa/data-pulse-static.png" frameMs={130} frames={6} loop sheet="/assets/nasa/data-pulse-sheet.png" size={32} /></div><p className="atlas-map-disclaimer">Mapa-base abstrato para selecionar coordenadas. Textura e animações são decorativas: não representam solo, uso da terra, satélite ao vivo nem clima.</p><ul aria-hidden="true" className="atlas-tile-key"><li><Image alt="" height={16} src="/assets/tiles/tile-grass.png" width={16} />textura</li><li><Image alt="" height={16} src="/assets/tiles/tile-soil.png" width={16} />neutra</li><li><Image alt="" height={16} src="/assets/tiles/tile-path.png" width={16} />offline</li></ul></div>;
}

async function addNeutralTexture(instance: import('maplibre-gl').Map, maplibregl: typeof import('maplibre-gl')) {
  const image = await instance.loadImage('/assets/tiles/neutral-terrain-sheet.png');
  if (!instance.hasImage('field-shift-neutral-texture')) instance.addImage('field-shift-neutral-texture', image.data);
  instance.addSource('field-shift-neutral-world', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[[-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]]] } } });
  instance.addLayer({ id: 'field-shift-neutral-texture', type: 'fill', source: 'field-shift-neutral-world', paint: { 'fill-pattern': 'field-shift-neutral-texture', 'fill-opacity': 0.42 } });
  instance.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
}
