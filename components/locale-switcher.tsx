'use client';

import { useLocale } from '@/components/locale-provider';

export function LocaleSwitcher() {
  const { locale, setLocale, copy } = useLocale();
  return <label className="sr-only">{copy.language}<select aria-label={copy.language} className="not-sr-only rounded border border-slate-600 bg-slate-900 px-2 py-1 text-xs" value={locale} onChange={(event) => setLocale(event.target.value as typeof locale)}><option value="pt-BR">PT-BR</option><option value="en">EN</option></select></label>;
}
