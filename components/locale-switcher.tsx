'use client';

import { useLocale } from '@/components/locale-provider';
import type { Locale } from '@/lib/i18n';

const options: Array<{ value: Locale; short: string; name: string; lang: string }> = [
  { value: 'en', short: 'EN', name: 'English', lang: 'en' },
  { value: 'pt-BR', short: 'PT', name: 'Português', lang: 'pt-BR' },
];

/** Two-segment EN / PT pill. Each segment is a real button (Tab + Enter/Space) and exposes aria-pressed. */
export function LocaleSwitcher() {
  const { locale, setLocale, copy } = useLocale();
  return <div aria-label={copy.language} className="inline-flex shrink-0 items-center rounded-full border border-slate-500 bg-slate-900 p-0.5 shadow-inner" role="group">
    {options.map((option) => {
      const active = locale === option.value;
      return <button aria-label={option.name} aria-pressed={active} className={`min-h-9 min-w-10 rounded-full px-3 text-xs font-extrabold tracking-wide transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-300 ${active ? 'bg-lime-300 text-slate-950 shadow' : 'text-slate-300 hover:bg-slate-800 hover:text-lime-200'}`} key={option.value} lang={option.lang} onClick={() => setLocale(option.value)} title={option.name} type="button">{option.short}</button>;
    })}
  </div>;
}
