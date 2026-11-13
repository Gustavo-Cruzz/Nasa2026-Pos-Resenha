'use client';

import { useLocale } from '@/components/locale-provider';

export function ExploreHeading() {
  const { locale } = useLocale();
  return <><h1 className="text-3xl font-bold">{locale === 'en' ? 'Global climate atlas' : 'Atlas climático global'}</h1><p className="mt-3 max-w-3xl text-slate-300">{locale === 'en' ? 'Choose any point to explore historical NASA conditions. This is not a local agronomic recommendation.' : 'Escolha qualquer ponto para explorar condições históricas NASA. Isso não é uma recomendação agronômica local.'}</p></>;
}
