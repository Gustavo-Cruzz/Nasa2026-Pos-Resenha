'use client';

import { useEffect, useId, useState } from 'react';
import { Search } from 'lucide-react';
import type { PlaceMatch } from '@/lib/brazil/places';
import { useLocale } from '@/components/locale-provider';

/** City search over the IBGE mesh: suggestions appear while typing. */
export function PlaceSearch({ onPick }: { onPick: (place: PlaceMatch) => void }) {
  const { locale } = useLocale();
  const en = locale === 'en';
  const listId = useId();
  const [text, setText] = useState('');
  const [found, setFound] = useState<{ query: string; results: PlaceMatch[] }>();
  const [closed, setClosed] = useState('');
  const query = text.trim();
  const results = found?.query === query && closed !== query ? found.results : [];

  useEffect(() => {
    if (query.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/places?q=${encodeURIComponent(query)}&limit=6`, { signal: controller.signal });
        const body = await response.json() as { status: string; results?: PlaceMatch[] };
        if (body.status === 'ok' && body.results) setFound({ query, results: body.results });
      } catch { /* typing continues; the list simply does not appear */ }
    }, 180);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query]);

  const pick = (place: PlaceMatch) => { setText(''); setFound(undefined); onPick(place); };
  return <div className="relative">
    <label className="sr-only" htmlFor={`${listId}-input`}>{en ? 'Search a city' : 'Buscar cidade'}</label>
    <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
    <input aria-autocomplete="list" aria-controls={listId} aria-expanded={results.length > 0} autoComplete="off" className="w-full rounded-xl border border-slate-600 bg-slate-950 py-3.5 pl-12 pr-4 text-base" id={`${listId}-input`} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && results[0]) { event.preventDefault(); pick(results[0]); } if (event.key === 'Escape') setClosed(query); }} placeholder={en ? 'Search a city in Brazil…' : 'Buscar uma cidade do Brasil…'} role="combobox" value={text} />
    {results.length ? <ul className="absolute inset-x-0 top-full z-[1000] mt-1 overflow-hidden rounded-xl border border-slate-600 bg-slate-900 shadow-xl" id={listId} role="listbox">{results.map((place) => <li key={place.code} role="option" aria-selected="false"><button className="block w-full px-4 py-3 text-left hover:bg-lime-300/10" onClick={() => pick(place)} type="button">{place.name} <span className="text-slate-400">({place.uf})</span></button></li>)}</ul> : null}
  </div>;
}
