'use client';

import type { Coordinates } from '@/lib/schema';
import { p0CropCoverage } from '@/lib/evidence-coverage';
import { CropCard } from '@/components/crops/crop-card';
import type { BrazilRegionalContext } from '@/lib/brazil/types';
import { useLocale } from '@/components/locale-provider';

export function CropDeck({ location, regionalContext }: { location: Coordinates | null; regionalContext?: BrazilRegionalContext | null }) {
  const { locale } = useLocale();
  const en = locale === 'en';
  const coverage = p0CropCoverage(location, regionalContext);
  return <section className="mt-5" aria-label={en ? 'Crops to explore' : 'Culturas para explorar'}><div className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="text-lg font-bold">{en ? 'Crops to explore' : 'Culturas para explorar'}</h3><span className="text-xs text-slate-300">8 P0 · {en ? 'exploratory catalog' : 'catálogo exploratório'}</span></div><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">{coverage.map((item) => <CropCard coverage={item} key={item.crop.id} />)}</div></section>;
}
