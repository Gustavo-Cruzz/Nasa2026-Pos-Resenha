'use client';

import { useEffect, useRef } from 'react';
import type { AtlasPoint } from '@/lib/atlas';

type WorldMapProps = { point: AtlasPoint | null; onPointChange: (point: AtlasPoint) => void; styleUrl?: string };

export function WorldMap({ point, onPointChange, styleUrl }: WorldMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<import('maplibre-gl').Map | null>(null);
  const marker = useRef<import('maplibre-gl').Marker | null>(null);
  const onPointChangeRef = useRef(onPointChange);
  const pointRef = useRef(point);
  useEffect(() => { onPointChangeRef.current = onPointChange; }, [onPointChange]);
  useEffect(() => { pointRef.current = point; if (point && map.current) { marker.current?.setLngLat([point.longitude, point.latitude]); map.current.flyTo({ center: [point.longitude, point.latitude], duration: 250 }); } }, [point]);

  useEffect(() => {
    if (!styleUrl || !container.current) return;
    let disposed = false;
    void import('maplibre-gl').then((maplibregl) => {
      if (disposed || !container.current) return;
      const initial = pointRef.current;
      const instance = new maplibregl.Map({ container: container.current, style: styleUrl, center: initial ? [initial.longitude, initial.latitude] : [0, 15], zoom: initial ? 5 : 1.35 });
      map.current = instance;
      const setMarker = (next: AtlasPoint) => {
        marker.current?.remove();
        const nextMarker = new maplibregl.Marker({ draggable: true }).setLngLat([next.longitude, next.latitude]).addTo(instance);
        marker.current = nextMarker;
        nextMarker.on('dragend', () => { const position = marker.current?.getLngLat(); if (position) onPointChangeRef.current({ latitude: Number(position.lat.toFixed(6)), longitude: Number(position.lng.toFixed(6)) }); });
      };
      instance.on('click', (event: import('maplibre-gl').MapMouseEvent) => { const next = { latitude: Number(event.lngLat.lat.toFixed(6)), longitude: Number(event.lngLat.lng.toFixed(6)) }; setMarker(next); onPointChangeRef.current(next); });
      instance.on('load', () => { if (pointRef.current) setMarker(pointRef.current); });
    }).catch(() => undefined);
    return () => { disposed = true; marker.current?.remove(); marker.current = null; map.current?.remove(); map.current = null; };
  }, [styleUrl]);

  if (!styleUrl) return <div className="atlas-map-fallback" role="img" aria-label="Mapa mundial indisponível sem estilo autorizado; use os campos de coordenadas abaixo"><div><p className="text-lg font-bold">Mapa sem tiles configurados</p><p className="mt-2 max-w-md text-sm text-slate-300">A seleção por latitude e longitude continua completa e acessível. Nenhum mapa ou camada climática sintética é exibido.</p></div></div>;
  return <div className="atlas-map" ref={container} aria-label="Mapa mundial interativo; clique para escolher uma coordenada" />;
}
