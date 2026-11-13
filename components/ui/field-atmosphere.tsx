'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

type Theme = 'day' | 'night';
const key = 'field-shift:visual-theme';
const layers = ['field-sky-day', 'field-horizon', 'field-plots'] as const;

/** Decorative scene controlled only by user preference; never derived from climate or location. */
export function FieldAtmosphere() {
  const [theme, setTheme] = useState<Theme>('day');
  useEffect(() => { const timer = window.setTimeout(() => { if (window.localStorage.getItem(key) === 'night') setTheme('night'); }, 0); return () => window.clearTimeout(timer); }, []);
  const choose = (next: Theme) => { setTheme(next); window.localStorage.setItem(key, next); };
  return <figure className="field-atmosphere m-0"><div aria-hidden="true" className="relative aspect-video overflow-hidden bg-slate-800">{theme === 'night' ? <Image alt="" className="object-cover [image-rendering:pixelated]" fill priority sizes="(min-width: 768px) 36vw, 100vw" src="/assets/environment/field-night.png" /> : <>{layers.map((layer) => <Image alt="" className="object-cover [image-rendering:pixelated]" fill key={layer} priority sizes="(min-width: 768px) 36vw, 100vw" src={`/assets/environment/${layer}.png`} />)}<Image alt="" className="object-contain object-right-bottom [image-rendering:pixelated]" fill priority sizes="(min-width: 768px) 18vw, 50vw" src="/assets/environment/farm-buildings.png" /><Image alt="" className="object-cover [image-rendering:pixelated]" fill priority sizes="(min-width: 768px) 36vw, 100vw" src="/assets/environment/field-foreground.png" /></>}</div><figcaption className="flex items-center justify-between gap-3 border-t border-slate-700 px-4 py-2 text-xs text-slate-300"><span>Cena ilustrativa — não é observação da fazenda.</span><span className="flex rounded-lg border border-slate-600 p-0.5" role="group" aria-label="Tema decorativo da cena"><button aria-pressed={theme === 'day'} className={`rounded px-2 py-1 ${theme === 'day' ? 'bg-lime-300 text-slate-950' : ''}`} type="button" onClick={() => choose('day')}>Dia</button><button aria-pressed={theme === 'night'} className={`rounded px-2 py-1 ${theme === 'night' ? 'bg-lime-300 text-slate-950' : ''}`} type="button" onClick={() => choose('night')}>Noite</button></span></figcaption></figure>;
}
