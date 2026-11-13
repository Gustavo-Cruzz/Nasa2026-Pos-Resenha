'use client';

import Link from 'next/link';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FieldAtmosphere } from '@/components/ui/field-atmosphere';
import { DemoBrazilButton } from '@/components/demo-brazil-button';
import { useLocale } from '@/components/locale-provider';

export default function HomePage() {
  const { copy } = useLocale();
  return <section className="grid gap-10 py-12 md:grid-cols-[1.4fr_1fr] md:items-center"><div><p className="mb-3 font-semibold text-lime-300">{copy.contextLine}</p><h1 className="text-4xl font-bold tracking-tight sm:text-6xl">{copy.productName}</h1><p className="mt-5 max-w-xl text-lg leading-8 text-slate-300">{copy.tagline}</p><div className="mt-8 flex flex-wrap gap-3"><Button asChild><Link href="/explore">{copy.start}<ArrowRight className="ml-2" size={18} /></Link></Button><DemoBrazilButton /></div><p className="mt-5 text-sm text-slate-300">A demonstração usa uma fazenda fictícia em Rio Verde e fontes brasileiras. O ZARC local não é extrapolado para o restante do país.</p></div><aside className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900"><FieldAtmosphere /><div className="p-6"><ShieldCheck className="text-lime-300" size={30} /><h2 className="mt-4 text-xl font-bold">{copy.limitTitle}</h2><p className="mt-2 text-slate-300">{copy.limitText}</p></div></aside></section>;
}
