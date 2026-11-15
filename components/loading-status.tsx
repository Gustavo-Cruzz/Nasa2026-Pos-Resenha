'use client';

import { useLocale } from '@/components/locale-provider';

/** Loading placeholder for server-rendered pages: English by default, Portuguese when that locale is chosen. */
export function LoadingStatus({ en, pt, className = 'text-slate-300' }: { en: string; pt: string; className?: string }) {
  const { locale } = useLocale();
  return <p className={className} role="status">{locale === 'en' ? en : pt}</p>;
}
