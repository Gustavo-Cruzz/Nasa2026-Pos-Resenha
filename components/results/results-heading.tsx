'use client';

import { useLocale } from '@/components/locale-provider';

export function ResultsHeading() {
  const { locale } = useLocale();
  return <><h1 className="text-3xl font-bold">{locale === 'en' ? 'Strategy comparison' : 'Comparação de estratégias'}</h1><p className="mt-3 max-w-3xl text-slate-300">{locale === 'en' ? 'Compare three hypotheses under the same climate window.' : 'Compare três hipóteses sob a mesma janela climática.'}</p></>;
}
