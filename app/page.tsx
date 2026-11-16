'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HomeScene } from '@/components/brand/home-scene';
import { EstacaSection } from '@/components/estaca/estaca-section';
import { useLocale } from '@/components/locale-provider';

export default function HomePage() {
  const { copy } = useLocale();
  const [first, second] = copy.heroTitle.split('. ').map((part, index, all) => (index < all.length - 1 ? `${part}.` : part));
  return <><section className="grid gap-10 py-6 md:grid-cols-2 md:items-center md:py-16">
    <div>
      <h1 className="home-title text-[2.25rem] font-bold leading-[1.08] tracking-tight text-cream sm:text-5xl lg:text-[3.5rem]"><span className="block">{first}</span><span className="block">{second}</span></h1>
      <p className="mt-5 max-w-xl text-lg leading-8 text-slate-300">{copy.tagline}</p>
      <div className="mt-8"><Button asChild><Link href="/farm">{copy.analyzeFarm}<ArrowRight aria-hidden="true" className="ml-2" size={18} /></Link></Button></div>
    </div>
    <HomeScene />
  </section><EstacaSection /></>;
}
