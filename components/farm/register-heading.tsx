'use client';

import { useLocale } from '@/components/locale-provider';

export function RegisterHeading() {
  const { locale } = useLocale();
  return <h1 className="page-title mb-4 font-bold">{locale === 'en' ? 'Talk with João about your farm' : 'Converse com o João sobre sua fazenda'}</h1>;
}
