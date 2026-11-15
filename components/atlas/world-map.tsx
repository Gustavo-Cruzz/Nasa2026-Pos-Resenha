'use client';

import { useEffect, useRef, useState } from 'react';
import type * as Leaflet from 'leaflet';
import { IMERG_GIBS_TILE_URL, latestNrtDate, MODIS_GIBS_TILE_URL, SMAP_GIBS_TILE_URL, type AtlasPoint, type AtlasPolygon, type MapLayers } from '@/lib/atlas';
import { labelsTileUrl, satelliteAttribution, satelliteTileUrl } from '@/lib/atlas-map-style';
import { useLocale } from '@/components/locale-provider';

type WorldMapProps = { point: AtlasPoint | null; onPointChange: (point: AtlasPoint) => void; polygon: AtlasPolygon; drawingPolygon: boolean; onPolygonChange: (polygon: AtlasPolygon) => void; layers: MapLayers; onMapReady?: (map: Leaflet.Map | null) => void; pointZoom?: number };

/** Satellite tiles run out above this zoom (Esri shows "Map data not yet available"), so every layer and the map itself stop here. */
export const MAP_MAX_ZOOM = 17;

/** Drop-shaped pin (inline SVG: no default Leaflet marker images to bundle). */
const pinHtml = (color: string) => `<svg width="34" height="44" viewBox="0 0 34 44" aria-hidden="true"><path d="M17 43C17 43 2 27 2 16a15 15 0 0 1 30 0c0 11-15 27-15 27Z" fill="${color}" stroke="#fdf6e3" stroke-width="2.5"/><circle cx="17" cy="16" r="5.5" fill="#fdf6e3"/></svg>`;

export function WorldMap({ point, onPointChange, polygon, drawingPolygon, onPolygonChange, layers, onMapReady, pointZoom = 8 }: WorldMapProps) {
  const onMapReadyRef = useRef(onMapReady);
  useEffect(() => { onMapReadyRef.current = onMapReady; }, [onMapReady]);
  const { locale } = useLocale();
  const en = locale === 'en';
  const [mapError, setMapError] = useState<string>();
  const container = useRef<HTMLDivElement>(null);
  const lib = useRef<typeof Leaflet | null>(null);
  const map = useRef<Leaflet.Map | null>(null);
  const marker = useRef<Leaflet.Marker | null>(null);
  const tileLayers = useRef<Partial<Record<keyof MapLayers, Leaflet.TileLayer>>>({});
  const areaLayer = useRef<Leaflet.LayerGroup | null>(null);
  const onPointChangeRef = useRef(onPointChange);
  const onPolygonChangeRef = useRef(onPolygonChange);
  const polygonRef = useRef(polygon);
  const drawingRef = useRef(drawingPolygon);
  const [ready, setReady] = useState(false);
  useEffect(() => { onPointChangeRef.current = onPointChange; }, [onPointChange]);
  useEffect(() => { onPolygonChangeRef.current = onPolygonChange; }, [onPolygonChange]);
  useEffect(() => { drawingRef.current = drawingPolygon; }, [drawingPolygon]);

  useEffect(() => {
    if (!container.current) return;
    let disposed = false;
    void import('leaflet').then((L) => {
      if (disposed || !container.current) return;
      lib.current = L;
      const instance = L.map(container.current, { center: [-15, -50], zoom: 4, zoomControl: false, worldCopyJump: true, maxZoom: MAP_MAX_ZOOM });
      L.tileLayer(satelliteTileUrl, { attribution: satelliteAttribution, maxZoom: MAP_MAX_ZOOM }).addTo(instance);
      // Borders and place names stay above the NASA layers (their zIndex is lower).
      L.tileLayer(labelsTileUrl, { maxZoom: MAP_MAX_ZOOM, zIndex: 10 }).addTo(instance);
      L.control.zoom({ position: 'bottomright' }).addTo(instance);
      instance.on('click', (event: Leaflet.LeafletMouseEvent) => {
        const next = { latitude: Number(event.latlng.lat.toFixed(6)), longitude: Number(event.latlng.lng.toFixed(6)) };
        if (drawingRef.current) { onPolygonChangeRef.current([...polygonRef.current, [next.longitude, next.latitude]]); return; }
        onPointChangeRef.current(next);
      });
      areaLayer.current = L.layerGroup().addTo(instance);
      map.current = instance;
      onMapReadyRef.current?.(instance);
      setReady(true);
    }).catch((error: unknown) => setMapError(error instanceof Error ? error.message : en ? 'Could not start the map.' : 'Não foi possível iniciar o mapa.'));
    return () => { disposed = true; onMapReadyRef.current?.(null); map.current?.remove(); map.current = null; marker.current = null; tileLayers.current = {}; areaLayer.current = null; setReady(false); };
  }, [en]);

  useEffect(() => {
    const L = lib.current; const instance = map.current;
    if (!ready || !L || !instance) return;
    if (!point) { marker.current?.remove(); marker.current = null; return; }
    const latlng: Leaflet.LatLngExpression = [point.latitude, point.longitude];
    if (!marker.current) {
      const next = L.marker(latlng, { draggable: true, icon: L.divIcon({ className: 'atlas-pin', html: pinHtml('#c53d2a'), iconSize: [34, 44], iconAnchor: [17, 43] }) }).addTo(instance);
      next.on('dragend', () => { const position = next.getLatLng(); onPointChangeRef.current({ latitude: Number(position.lat.toFixed(6)), longitude: Number(position.lng.toFixed(6)) }); });
      marker.current = next;
    } else marker.current.setLatLng(latlng);
    instance.setView(latlng, Math.min(MAP_MAX_ZOOM, Math.max(instance.getZoom(), pointZoom)), { animate: true });
  }, [point, ready, pointZoom]);

  useEffect(() => {
    const L = lib.current; const instance = map.current;
    if (!ready || !L || !instance) return;
    const nrt = latestNrtDate();
    const make: Record<keyof MapLayers, () => Leaflet.TileLayer> = {
      smap: () => L.tileLayer(SMAP_GIBS_TILE_URL, { maxNativeZoom: 6, maxZoom: MAP_MAX_ZOOM, opacity: 0.62, zIndex: 3, attribution: 'NASA EOSDIS GIBS · SMAP L4' }),
      rain: () => L.tileLayer(IMERG_GIBS_TILE_URL(nrt), { maxNativeZoom: 6, maxZoom: MAP_MAX_ZOOM, opacity: 0.75, zIndex: 4, attribution: 'NASA EOSDIS GIBS · GPM IMERG' }),
      modis: () => L.tileLayer(MODIS_GIBS_TILE_URL(nrt), { maxNativeZoom: 9, maxZoom: MAP_MAX_ZOOM, opacity: 0.9, zIndex: 2, attribution: 'NASA EOSDIS GIBS · MODIS Terra' }),
    };
    for (const key of ['modis', 'smap', 'rain'] as const) {
      if (layers[key] && !tileLayers.current[key]) tileLayers.current[key] = make[key]();
      const layer = tileLayers.current[key];
      if (layers[key]) layer?.addTo(instance); else layer?.remove();
    }
  }, [layers, ready]);

  useEffect(() => {
    polygonRef.current = polygon;
    const L = lib.current; const group = areaLayer.current;
    if (!ready || !L || !group) return;
    group.clearLayers();
    const latlngs = polygon.map(([lng, lat]) => [lat, lng] as Leaflet.LatLngTuple);
    const style = { color: '#d9ff87', weight: 3, dashArray: '6 4', fillColor: '#b7f34a', fillOpacity: 0.18 };
    if (latlngs.length >= 3) L.polygon(latlngs, style).addTo(group); else if (latlngs.length >= 2) L.polyline(latlngs, style).addTo(group);
  }, [polygon, ready]);

  return <div className={`atlas-map-frame ${mapError ? 'atlas-map-frame-error' : ''}`}><div className="atlas-map" ref={container} aria-label={drawingPolygon ? (en ? 'Interactive map in area drawing mode; click to add vertices' : 'Mapa interativo em modo de desenho de área; clique para adicionar vértices') : (en ? 'Interactive satellite map; drag, zoom, and click to choose the farm location' : 'Mapa de satélite interativo; arraste, aproxime e clique para escolher a localização da fazenda')} />{mapError ? <p className="atlas-map-error" role="status">{en ? 'Interactive map unavailable in this browser. Use latitude and longitude below.' : 'Mapa interativo indisponível neste navegador. Use latitude e longitude abaixo.'}</p> : null}</div>;
}
