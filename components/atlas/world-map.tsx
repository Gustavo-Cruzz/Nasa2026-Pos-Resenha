'use client';

import { useEffect, useRef, useState } from 'react';
import { SMAP_GIBS_TILE_URL, type AtlasPoint, type AtlasPolygon } from '@/lib/atlas';
import { fieldShiftMapAttribution, fieldShiftMapStyleUrl } from '@/lib/atlas-map-style';
import { useLocale } from '@/components/locale-provider';

type WorldMapProps = { point: AtlasPoint | null; onPointChange: (point: AtlasPoint) => void; polygon: AtlasPolygon; drawingPolygon: boolean; onPolygonChange: (polygon: AtlasPolygon) => void; smapVisible: boolean };

export function WorldMap({ point, onPointChange, polygon, drawingPolygon, onPolygonChange, smapVisible }: WorldMapProps) {
  const { locale } = useLocale();
  const en = locale === 'en';
  const [mapError, setMapError] = useState<string>();
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<import('maplibre-gl').Map | null>(null);
  const marker = useRef<import('maplibre-gl').Marker | null>(null);
  const onPointChangeRef = useRef(onPointChange);
  const onPolygonChangeRef = useRef(onPolygonChange);
  const pointRef = useRef(point);
  const polygonRef = useRef(polygon);
  const drawingRef = useRef(drawingPolygon);
  const smapVisibleRef = useRef(smapVisible);
  useEffect(() => { onPointChangeRef.current = onPointChange; }, [onPointChange]);
  useEffect(() => { onPolygonChangeRef.current = onPolygonChange; }, [onPolygonChange]);
  useEffect(() => { drawingRef.current = drawingPolygon; }, [drawingPolygon]);
  useEffect(() => { pointRef.current = point; if (point && map.current) { marker.current?.setLngLat([point.longitude, point.latitude]); map.current.flyTo({ center: [point.longitude, point.latitude], duration: 250 }); } }, [point]);
  useEffect(() => { polygonRef.current = polygon; updatePolygonSource(map.current, polygon); }, [polygon]);
  useEffect(() => { smapVisibleRef.current = smapVisible; map.current?.setLayoutProperty('nasa-smap-root-zone', 'visibility', smapVisible ? 'visible' : 'none'); }, [smapVisible]);

  useEffect(() => {
    if (!container.current) return;
    let disposed = false;
    void import('maplibre-gl').then((maplibregl) => {
      if (disposed || !container.current) return;
      const initial = pointRef.current;
      const instance = new maplibregl.Map({ container: container.current, style: fieldShiftMapStyleUrl, center: initial ? [initial.longitude, initial.latitude] : [0, 15], zoom: initial ? 5 : 1.35, attributionControl: false });
      map.current = instance;
      instance.addControl(new maplibregl.AttributionControl({ compact: false, customAttribution: `${fieldShiftMapAttribution} · NASA EOSDIS GIBS / SMAP` }), 'bottom-right');
      const setMarker = (next: AtlasPoint) => {
        marker.current?.remove();
        const nextMarker = new maplibregl.Marker({ draggable: true }).setLngLat([next.longitude, next.latitude]).addTo(instance);
        marker.current = nextMarker;
        nextMarker.on('dragend', () => { const position = marker.current?.getLngLat(); if (position) onPointChangeRef.current({ latitude: Number(position.lat.toFixed(6)), longitude: Number(position.lng.toFixed(6)) }); });
      };
      instance.on('click', (event: import('maplibre-gl').MapMouseEvent) => {
        if (drawingRef.current) {
          onPolygonChangeRef.current([...polygonRef.current, [Number(event.lngLat.lng.toFixed(6)), Number(event.lngLat.lat.toFixed(6))]]);
          return;
        }
        const next = { latitude: Number(event.lngLat.lat.toFixed(6)), longitude: Number(event.lngLat.lng.toFixed(6)) }; setMarker(next); onPointChangeRef.current(next);
      });
      instance.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right');
      instance.on('load', () => {
        instance.addSource('nasa-smap-root-zone', { type: 'raster', tiles: [SMAP_GIBS_TILE_URL], tileSize: 256, maxzoom: 6, attribution: 'NASA EOSDIS GIBS · SMAP L4' });
        instance.addLayer({ id: 'nasa-smap-root-zone', type: 'raster', source: 'nasa-smap-root-zone', layout: { visibility: smapVisibleRef.current ? 'visible' : 'none' }, paint: { 'raster-opacity': 0.62 } });
        instance.addSource('field-area', { type: 'geojson', data: polygonGeoJson(polygonRef.current) });
        instance.addLayer({ id: 'field-area-fill', type: 'fill', source: 'field-area', filter: ['==', '$type', 'Polygon'], paint: { 'fill-color': '#b7f34a', 'fill-opacity': 0.18 } });
        instance.addLayer({ id: 'field-area-line', type: 'line', source: 'field-area', paint: { 'line-color': '#d9ff87', 'line-width': 3, 'line-dasharray': [2, 1] } });
        if (pointRef.current) setMarker(pointRef.current);
      });
    }).catch((error: unknown) => setMapError(error instanceof Error ? error.message : en ? 'Could not start the local map.' : 'Não foi possível iniciar o mapa local.'));
    return () => { disposed = true; marker.current?.remove(); marker.current = null; map.current?.remove(); map.current = null; };
  }, [en]);

  return <div className={`atlas-map-frame ${mapError ? 'atlas-map-frame-error' : ''}`}><div className="atlas-map" ref={container} aria-label={drawingPolygon ? (en ? 'Interactive map in area drawing mode; click to add vertices' : 'Mapa interativo em modo de desenho de área; clique para adicionar vértices') : (en ? 'Interactive world map; drag, zoom, and click to choose the farm location' : 'Mapa mundial interativo; arraste, aproxime e clique para escolher a localização da fazenda')} />{mapError ? <p className="atlas-map-error" role="status">{en ? 'Interactive map unavailable in this browser. Use latitude and longitude below.' : 'Mapa interativo indisponível neste navegador. Use latitude e longitude abaixo.'}</p> : null}</div>;
}

function polygonGeoJson(polygon: AtlasPolygon): GeoJSON.FeatureCollection {
  if (polygon.length >= 3) return { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[...polygon, polygon[0]]] } }] };
  if (polygon.length >= 2) return { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: polygon } }] };
  return { type: 'FeatureCollection', features: [] };
}

function updatePolygonSource(map: import('maplibre-gl').Map | null, polygon: AtlasPolygon) {
  const source = map?.getSource('field-area') as import('maplibre-gl').GeoJSONSource | undefined;
  source?.setData(polygonGeoJson(polygon));
}
