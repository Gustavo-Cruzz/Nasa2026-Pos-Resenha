'use client';

import { useLocale } from '@/components/locale-provider';

export function ExploreHeading() {
  const { locale } = useLocale();
  const en = locale === 'en';
  return <><h1 className="page-title font-bold">{en ? 'Explore a region' : 'Explore uma região'}</h1><p className="mt-3 mb-6 max-w-3xl text-slate-300">{en ? 'Explore any place: NASA historical climate appears right on the map and João comments on what it means for planting.' : 'Explore qualquer lugar: o clima histórico da NASA aparece no próprio mapa e o João comenta o que isso significa para o plantio.'}</p></>;
}
