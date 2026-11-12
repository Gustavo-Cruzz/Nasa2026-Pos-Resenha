import Link from 'next/link';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { defaultLocale, dictionaries } from '@/lib/i18n';

export default function HomePage() {
  const copy = dictionaries[defaultLocale];
  return <section className="grid gap-10 py-12 md:grid-cols-[1.4fr_1fr] md:items-center"><div><p className="mb-3 font-semibold text-lime-300">Built for the world. Validated locally. Powered by NASA.</p><h1 className="text-4xl font-bold tracking-tight sm:text-6xl">{copy.productName}</h1><p className="mt-5 max-w-xl text-lg leading-8 text-slate-300">{copy.tagline}</p><div className="mt-8"><Button asChild><Link href="/explore">{copy.start}<ArrowRight className="ml-2" size={18} /></Link></Button></div></div><aside className="rounded-xl border border-slate-700 bg-slate-900 p-6"><ShieldCheck className="text-lime-300" size={30} /><h2 className="mt-4 text-xl font-bold">Limites visíveis desde o início</h2><p className="mt-2 text-slate-300">Dados climáticos e regras agronômicas serão mostrados separadamente. Ausência de evidência nunca vira recomendação.</p></aside></section>;
}
