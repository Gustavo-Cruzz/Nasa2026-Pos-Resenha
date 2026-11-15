'use client';

import { useLocale } from '@/components/locale-provider';

export function SkipLink() {
  const { locale } = useLocale();
  return <a className="skip-link" href="#main-content">{locale === 'en' ? 'Skip to content' : 'Ir para o conteúdo'}</a>;
}
