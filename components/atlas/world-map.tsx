'use client';

import { useEffect, useRef, useState } from 'react';
import type { AtlasPoint } from '@/lib/atlas';
import { fieldShiftMapAttribution, fieldShiftMapStyleUrl } from '@/lib/atlas-map-style';

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
      const instance = new maplibregl.Map({ container: container.current, style: fieldShiftMapStyleUrl, center: initial ? [initial.longitude, initial.latitude] : [0, 15], zoom: initial ? 5 : 1.35, attributionControl: false });
      map.current = instance;
      instance.addControl(new maplibregl.AttributionControl({ compact: false, customAttribution: fieldShiftMapAttribution }), 'bottom-right');
      const setMarker = (next: AtlasPoint) => {
        marker.current?.remove();
        const nextMarker = new maplibregl.Marker({ draggable: true }).setLngLat([next.longitude, next.latitude]).addTo(instance);
        marker.current = nextMarker;
        nextMarker.on('dragend', () => { const position = marker.current?.getLngLat(); if (position) onPointChangeRef.current({ latitude: Number(position.lat.toFixed(6)), longitude: Number(position.lng.toFixed(6)) }); });
      };
      instance.on('click', (event: import('maplibre-gl').MapMouseEvent) => { const next = { latitude: Number(event.lngLat.lat.toFixed(6)), longitude: Number(event.lngLat.lng.toFixed(6)) }; setMarker(next); onPointChangeRef.current(next); });
      instance.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right');
      instance.on('load', () => { if (pointRef.current) setMarker(pointRef.current); });
    }).catch((error: unknown) => setMapError(error instanceof Error ? error.message : 'Não foi possível iniciar o mapa local.'));
    return () => { disposed = true; marker.current?.remove(); marker.current = null; map.current?.remove(); map.current = null; };
  }, []);

  return <div className="atlas-map-frame"><div className="atlas-map" ref={container} aria-label="Mapa mundial interativo; arraste, aproxime e clique para escolher a localização da fazenda" />{mapError ? <p className="atlas-map-error" role="status">Mapa interativo indisponível neste navegador. Use latitude e longitude abaixo.</p> : null}</div>;
}
