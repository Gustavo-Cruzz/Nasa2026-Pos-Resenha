'use client';

import Link from 'next/link';
import { Sprout } from 'lucide-react';
import { useLocale } from '@/components/locale-provider';

/** Entry point from the A/B/C comparison into the illustrative farm stories. Does not touch the comparison state. */
export function ScenarioComparisonShortcut() {
  const { locale } = useLocale();
  const en = locale === 'en';
  return <Link className="inline-flex min-h-11 items-center gap-2 rounded-md bg-lime-300 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-lime-200" href="/future-stories"><Sprout aria-hidden="true" size={18} />{en ? 'Explore your possible futures' : 'Explore seus futuros possíveis'}</Link>;
}
