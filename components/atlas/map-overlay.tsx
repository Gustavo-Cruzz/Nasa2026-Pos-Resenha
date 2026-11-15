'use client';

import type { ReactNode } from 'react';
import { CloudRain, Droplets, MapPin, Satellite } from 'lucide-react';
import { latestNrtDate, SMAP_GIBS_DATE, type MapLayers } from '@/lib/atlas';
import { ClientOnly } from '@/components/client-only';
import { useLocale } from '@/components/locale-provider';

const SHORT_MONTHS = { 'pt-BR': ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'], en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] } as const;
const shortDate = (iso: string, locale: 'pt-BR' | 'en') => `${Number(iso.slice(8, 10))} ${SHORT_MONTHS[locale][Number(iso.slice(5, 7)) - 1]}`;

/** Floating layer over the map: place name, NASA layer toggles and a caption naming the date of each active layer. */
export function MapOverlay({ name, coordinates, layers, onToggle, live }: { name: string; coordinates: string; layers: MapLayers; onToggle: (layer: keyof MapLayers) => void; live?: ReactNode }) {
  const { locale } = useLocale();
  return <div className="pointer-events-none absolute inset-3 z-10">
    <div className="flex flex-col items-start gap-2">
      <div className="pointer-events-auto flex max-w-full items-center gap-2.5 rounded-xl border border-slate-600 bg-slate-950/85 px-3.5 py-2.5 shadow-lg backdrop-blur">
        <MapPin aria-hidden="true" className="shrink-0 text-lime-300" size={20} />
        <div className="min-w-0"><p className="truncate text-base font-bold leading-tight">{name}</p><p className="font-mono text-[11px] text-slate-400">{coordinates}</p></div>
      </div>
      <ClientOnly fallback={null}><Chips layers={layers} locale={locale} onToggle={onToggle} /></ClientOnly>
    </div>
    {live ? <div className="absolute right-0 top-0">{live}</div> : null}
    <ClientOnly fallback={null}><Caption layers={layers} locale={locale} /></ClientOnly>
  </div>;
}

type LayerInfo = { key: keyof MapLayers; icon: typeof CloudRain; label: string; caption: string };
function layerInfo(locale: 'pt-BR' | 'en'): LayerInfo[] {
  const en = locale === 'en';
  const date = shortDate(latestNrtDate(), locale);
  return [
    { key: 'rain', icon: CloudRain, label: en ? 'Rain' : 'Chuva', caption: en ? `Rain on ${date} · NASA GPM IMERG` : `Chuva em ${date} · NASA GPM IMERG` },
    { key: 'modis', icon: Satellite, label: en ? 'Clouds' : 'Nuvens', caption: en ? `Satellite image of ${date} · NASA MODIS` : `Imagem de satélite de ${date} · NASA MODIS` },
    { key: 'smap', icon: Droplets, label: en ? 'Soil moisture' : 'Umidade do solo', caption: en ? `Soil moisture (root zone) on ${shortDate(SMAP_GIBS_DATE, locale)} · NASA SMAP` : `Umidade do solo (zona radicular) em ${shortDate(SMAP_GIBS_DATE, locale)} · NASA SMAP` },
  ];
}

function Chips({ layers, locale, onToggle }: { layers: MapLayers; locale: 'pt-BR' | 'en'; onToggle: (layer: keyof MapLayers) => void }) {
  return <div aria-label={locale === 'en' ? 'NASA map layers' : 'Camadas NASA do mapa'} className="pointer-events-auto flex flex-wrap gap-1.5" role="group">
    {layerInfo(locale).map(({ key, icon: Icon, label }) => <button aria-pressed={layers[key]} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold shadow backdrop-blur ${layers[key] ? 'border-lime-300 bg-lime-300 text-slate-950' : 'border-slate-600 bg-slate-950/85 text-slate-100 hover:border-lime-300'}`} key={key} onClick={() => onToggle(key)} type="button"><Icon aria-hidden="true" size={14} />{label}</button>)}
  </div>;
}

/** Bottom-left caption: names the date of every active layer; nothing is shown when no layer is on. */
function Caption({ layers, locale }: { layers: MapLayers; locale: 'pt-BR' | 'en' }) {
  const active = layerInfo(locale).filter((chip) => layers[chip.key]);
  if (!active.length) return null;
  return <ul className="pointer-events-auto absolute bottom-16 left-0 m-0 md:bottom-7 max-w-[calc(100%-4.5rem)] list-none space-y-1 rounded-lg border border-slate-600 bg-slate-950/85 p-2.5 text-[11px] leading-snug text-slate-200 backdrop-blur">
    {active.map((chip) => <li key={chip.key}>{chip.key === 'smap' ? chip.caption : <><span aria-hidden="true" className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300 align-middle" />{chip.caption}</>}</li>)}
    {active.some((chip) => chip.key !== 'smap') ? <li className="text-slate-400">{locale === 'en' ? 'Rain and cloud layers are about one day behind.' : 'Chuva e nuvens têm cerca de 1 dia de atraso.'}</li> : null}
    {active.some((chip) => chip.key === 'smap') ? <li className="text-slate-400">{locale === 'en' ? `Soil moisture is a reference image from ${shortDate(SMAP_GIBS_DATE, locale)} ${SMAP_GIBS_DATE.slice(0, 4)}, not today's.` : `Umidade do solo é uma imagem de referência de ${shortDate(SMAP_GIBS_DATE, locale)} ${SMAP_GIBS_DATE.slice(0, 4)}, não a de hoje.`}</li> : null}
    <li className="text-slate-400">{locale === 'en' ? 'Visual layers: not a measurement of your farm.' : 'Camadas visuais: não são medição da sua fazenda.'}</li>
  </ul>;
}
