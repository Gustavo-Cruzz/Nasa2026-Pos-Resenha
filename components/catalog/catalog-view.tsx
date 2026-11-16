'use client';

import { useCallback, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { BloomSprite } from '@/components/catalog/bloom-sprite';
import { t } from '@/components/catalog/catalog-text';
import { CropDetail } from '@/components/catalog/crop-detail';
import { useLocale } from '@/components/locale-provider';
import { crops } from '@/lib/catalog';

type Filter = 'all' | 'commercial' | 'cover' | 'forage';
const filters: Filter[] = ['all', 'commercial', 'cover', 'forage'];
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function CatalogView() {
  const { locale } = useLocale();
  const loc = locale === 'en' ? 'en' : 'pt-BR';
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [blooming, setBlooming] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [bloomKey, setBloomKey] = useState(0);

  const list = useMemo(() => {
    const q = norm(query.trim());
    return crops.filter((c) => (filter === 'all' || c.purposes.includes(filter)) && (!q || [c.commonNames['pt-BR'], c.commonNames.en, c.scientificName].some((s) => norm(s).includes(q))));
  }, [filter, query]);

  function pick(id: string) {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setBloomKey((k) => k + 1);
    if (reduce) { setOpenId(id); return; }
    setBlooming(id);
    window.setTimeout(() => { setBlooming(null); setOpenId(id); }, 700);
  }
  const close = useCallback(() => setOpenId(null), []);
  const open = openId ? crops.find((c) => c.id === openId) : undefined;

  return <section className="mx-auto max-w-6xl">
    <h1 className="page-title font-bold">{t.title[loc]}</h1>
    <p className="mt-3 max-w-3xl text-lg text-slate-300">{t.lead[loc]}</p>
    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
      <label className="relative block sm:w-80">
        <span className="sr-only">{t.search[loc]}</span>
        <Search aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input className="w-full border-2 border-slate-600 bg-slate-900 py-2 pl-9 pr-3 text-cream placeholder:text-slate-500 focus:border-lime-300 focus:outline-none" onChange={(e) => setQuery(e.target.value)} placeholder={t.search[loc]} type="search" value={query} />
      </label>
      <div className="flex flex-wrap gap-2" role="group">
        {filters.map((f) => <button aria-pressed={filter === f} className={`border-2 px-3 py-1.5 text-sm font-bold ${filter === f ? 'border-lime-300 bg-lime-300 text-slate-900' : 'border-slate-600 text-slate-200 hover:border-lime-300'}`} key={f} onClick={() => setFilter(f)} type="button">{t[f][loc]}</button>)}
      </div>
      <p aria-live="polite" className="font-mono text-sm text-slate-400 sm:ml-auto">{list.length} {t.count[loc]}</p>
    </div>
    {list.length === 0 ? <p className="mt-8 text-slate-300">{t.none[loc]}</p> : null}
    <ul className="cat-field mt-6">
      {list.map((c, i) => <li className="cat-cell" key={c.id} style={{ marginTop: `${(i * 7) % 5 * 3}px` }}>
        <button className="cat-sway group flex w-full flex-col items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime-300" onClick={() => pick(c.id)} type="button">
          <span className="cat-mound flex items-end justify-center pb-1">
            <span className="block"><BloomSprite active={blooming === c.id} bloomKey={bloomKey} cropId={c.id} name={c.commonNames[loc]} size={72} /></span>
          </span>
          <span className="mt-0.5 block max-w-full truncate rounded-sm bg-black/55 px-1.5 py-0.5 text-[11px] font-bold leading-tight text-cream group-hover:bg-black/75">{c.commonNames[loc]}</span>
        </button>
      </li>)}
    </ul>
    {open ? <CropDetail bloomKey={bloomKey} crop={open} locale={loc} onClose={close} /> : null}
  </section>;
}
