'use client';

import { useLocale } from '@/components/locale-provider';

export function RegisterHeading() {
  const { locale } = useLocale();
  return <h1 className="page-title mb-4 font-bold">{locale === 'en' ? 'Register your farm with João' : 'Cadastre a sua fazenda com o João'}</h1>;
}
