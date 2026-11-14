'use client';

import { useLocale } from '@/components/locale-provider';

export function ExploreHeading() {
  const { locale } = useLocale();
  return <><h1 className="page-title font-bold">{locale === 'en' ? 'Explore your region' : 'Explore a sua região'}</h1><p className="mt-3 mb-6 max-w-3xl text-slate-300">{locale === 'en' ? 'Search a city or tap the map to see the typical rain and temperature, month by month.' : 'Busque uma cidade ou toque no mapa para ver a chuva e a temperatura típicas, mês a mês.'}</p></>;
}
