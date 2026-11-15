'use client';

import { WorldMap } from '@/components/atlas/world-map';
import { ClientOnly } from '@/components/client-only';
import { useLocale } from '@/components/locale-provider';
import type { MapLayers } from '@/lib/atlas';
import type { MapPlace } from '@/lib/chat/flow';
import { SUGGESTED_AREA_HA, suggestedBoundary } from '@/lib/farm/default-boundary';

const NO_LAYERS: MapLayers = { smap: false, rain: false, modis: false };
const noop = () => undefined;

/** Read-only satellite map of one place, shown inside a chat bubble. */
export function ChatMiniMap({ place }: { place: MapPlace }) {
  const { locale } = useLocale();
  const en = locale === 'en';
  const caption = `${place.latitude.toFixed(4)}, ${place.longitude.toFixed(4)}`;
  return <figure className="m-0 w-full">
    <div aria-label={en ? `Map of the location ${caption}` : `Mapa do local ${caption}`} className="h-48 w-full overflow-hidden rounded-xl border border-slate-700" role="img">
      <ClientOnly fallback={<div className="h-48 bg-slate-900" />}>
        <div className="h-48 [&_.atlas-map-frame]:h-full [&_.atlas-map]:h-full"><WorldMap drawingPolygon={false} layers={NO_LAYERS} onPointChange={noop} onPolygonChange={noop} point={{ latitude: place.latitude, longitude: place.longitude }} pointZoom={13} polygon={suggestedBoundary(place)} /></div>
      </ClientOnly>
    </div>
    <figcaption className="mt-1 text-xs text-slate-400">{caption} · {en ? `Suggested area of ~${SUGGESTED_AREA_HA} ha — you adjust it later in My farm` : `Área sugerida de ~${SUGGESTED_AREA_HA} ha — você ajusta depois em Minha fazenda`}</figcaption>
  </figure>;
}
