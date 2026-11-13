'use client';

import { useState } from 'react';
import type { Coordinates } from '@/lib/schema';
import { p0CropCoverage, type CropCoverage } from '@/lib/evidence-coverage';
import { CropDetailDrawer } from '@/components/crops/crop-detail-drawer';
import { CropCard } from '@/components/crops/crop-card';
import type { BrazilRegionalContext } from '@/lib/brazil/types';
import { useLocale } from '@/components/locale-provider';

export function CropDeck({ location, regionalContext }: { location: Coordinates | null; regionalContext?: BrazilRegionalContext | null }) {
  const { locale } = useLocale();
  const en = locale === 'en';
  const [selected, setSelected] = useState<CropCoverage>();
  const coverage = p0CropCoverage(location, regionalContext);
  return <section className="mt-6" aria-label={en ? 'Crops to explore' : 'Culturas para explorar'}><div className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="text-lg font-bold">{en ? 'Crops to explore' : 'Culturas para explorar'}</h3><span className="text-xs text-slate-300">8 P0 · {en ? 'N/D when data is missing' : 'N/D quando não há dado'}</span></div><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">{coverage.map((item) => <CropCard coverage={item} key={item.crop.id} onSelect={() => setSelected(item)} />)}</div>{selected ? <CropDetailDrawer coverage={selected} onClose={() => setSelected(undefined)} /> : null}</section>;
}
