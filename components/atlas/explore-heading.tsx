'use client';

import { useLocale } from '@/components/locale-provider';

export function ExploreHeading() {
  const { locale } = useLocale();
  const en = locale === 'en';
  return <><h1 className="page-title font-bold">{en ? 'Explore a region' : 'Explore uma região'}</h1><p className="mt-3 mb-6 max-w-3xl text-slate-300">{en ? 'Pick the farm area on the map: NASA historical climate appears right on the map and João helps you build the rotation.' : 'Escolha a área da fazenda no mapa: o clima histórico da NASA aparece no próprio mapa e o João te ajuda a montar a rotação.'}</p></>;
}
