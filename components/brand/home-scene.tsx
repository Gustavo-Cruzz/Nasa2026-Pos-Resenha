'use client';

import Image from 'next/image';
import { useLocale } from '@/components/locale-provider';

/** Home illustration: a farmer with a tablet under a yellow ipê, Cerrado plateaus, crop rows and a satellite sending data. Decorative; never derived from climate or location. */
export function HomeScene() {
  const { locale } = useLocale();
  const en = locale === 'en';
  return <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-slate-700 bg-slate-800">
    <Image alt={en ? 'Pixel-art illustration: a farmer with a tablet under a flowering yellow ipê tree, Cerrado plateaus, crop rows and a satellite sending data.' : 'Ilustração em pixel art: um agricultor com um tablet sob um ipê amarelo florido, chapadas do Cerrado, linhas de cultivo e um satélite enviando dados.'} className="object-cover [image-rendering:pixelated]" fill priority sizes="(min-width: 768px) 50vw, 100vw" src="/assets/brand/home-cerrado.webp" />
  </div>;
}
