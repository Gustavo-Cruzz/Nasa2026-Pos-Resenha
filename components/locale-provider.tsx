'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { defaultLocale, dictionaries, type Locale } from '@/lib/i18n';

type LocaleContextValue = { locale: Locale; setLocale: (locale: Locale) => void; copy: typeof dictionaries[Locale] };
const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => { if (typeof window === 'undefined') return defaultLocale; const saved = window.localStorage.getItem('field-shift:locale'); return saved === 'pt-BR' || saved === 'en' ? saved : defaultLocale; });
  useEffect(() => { document.documentElement.lang = locale; window.localStorage.setItem('field-shift:locale', locale); }, [locale]);
  return <LocaleContext.Provider value={{ locale, setLocale, copy: dictionaries[locale] }}>{children}</LocaleContext.Provider>;
}

export function useLocale() { const context = useContext(LocaleContext); if (!context) throw new Error('useLocale must be inside LocaleProvider'); return context; }
