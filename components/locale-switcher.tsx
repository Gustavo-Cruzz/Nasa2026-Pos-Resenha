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
  return <div aria-label={copy.language} className="inline-flex shrink-0 items-center rounded-full border border-slate-700 bg-slate-900/50 p-0.5" role="group">
    {options.map((option) => {
      const active = locale === option.value;
      return <button aria-label={option.name} aria-pressed={active} className={`min-h-9 min-w-9 rounded-full px-2 text-[0.6875rem] font-bold tracking-wide transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-300 ${active ? 'bg-lime-300/85 text-slate-950' : 'text-slate-400 hover:bg-slate-800 hover:text-lime-200'}`} key={option.value} lang={option.lang} onClick={() => setLocale(option.value)} title={option.name} type="button">{option.short}</button>;
    })}
  </div>;
}
