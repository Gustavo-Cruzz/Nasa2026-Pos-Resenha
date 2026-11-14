'use client';

import { useLocale } from '@/components/locale-provider';

export function ResultsHeading() {
  const { locale, copy } = useLocale();
  return <><h1 className="page-title font-bold">{locale === 'en' ? 'Strategy comparison' : 'Comparação de estratégias'}</h1><p className="mt-3 max-w-3xl text-slate-300">{copy.compareSubtitle}</p></>;
}
