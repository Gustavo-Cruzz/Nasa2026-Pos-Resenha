'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X } from 'lucide-react';
import { PlantaeLogo } from '@/components/brand/plantae-logo';
import { usePathname } from 'next/navigation';
import { useLocale } from '@/components/locale-provider';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { PageReader } from '@/components/accessibility/page-reader';

export function SiteHeader() {
  const { copy } = useLocale();
  const pathname = usePathname();
  // Open state is tied to the path it was opened on, so navigating closes the menu without an effect.
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === pathname;
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpenAt(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  const links = [
    { href: '/explore', label: copy.explore, icon: 'explore', also: [] as string[] },
    { href: '/chat', label: copy.farm, icon: 'farm', also: ['/farm'] },
    { href: '/results', label: copy.compare, icon: 'compare', also: ['/lab', '/future-stories'] },
    { href: '/painel', label: copy.dashboard, icon: undefined, also: ['/entrar', '/cadastro'] as string[] },
    { href: '/methodology', label: copy.methodology, icon: 'methodology', also: [] as string[] },
  ];
  const isActive = (link: (typeof links)[number]) => pathname === link.href || link.also.includes(pathname);
  const itemClass = (link: (typeof links)[number]) => `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${isActive(link) ? 'bg-lime-300/15 text-lime-200' : 'text-slate-300 hover:bg-lime-300/10 hover:text-lime-200'}`;
  const icon = (link: (typeof links)[number]) => link.icon ? <Image alt="" aria-hidden="true" className="[image-rendering:pixelated]" height={28} src={`/assets/journey/journey-${link.icon}.png`} width={28} /> : null;
  return <header className="relative border-b border-slate-800"><nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4" aria-label="Navegação principal">
    <Link aria-label={copy.productName} className="shrink-0 rounded-lg" href="/"><PlantaeLogo className="max-sm:hidden" size={34} /><PlantaeLogo className="sm:hidden" compact size={34} /></Link>
    <div className="hidden items-center gap-1 md:flex">{links.map((link) => <Link aria-current={isActive(link) ? 'page' : undefined} className={itemClass(link)} href={link.href} key={link.href}>{icon(link)}{link.label}</Link>)}</div>
    <div className="flex items-center gap-2"><PageReader targetId="main-content" /><LocaleSwitcher />
      <button aria-controls="mobile-menu" aria-expanded={open} aria-label={copy.menu} className="grid h-10 w-10 place-items-center rounded-lg border border-slate-600 text-cream hover:border-lime-300 md:hidden" onClick={() => setOpenAt(open ? null : pathname)} type="button">{open ? <X aria-hidden="true" size={22} /> : <Menu aria-hidden="true" size={22} />}</button>
    </div>
  </nav>
  {open ? <><button aria-label="Fechar menu" className="absolute inset-x-0 top-full z-30 h-screen cursor-default bg-black/50 md:hidden" onClick={() => setOpenAt(null)} tabIndex={-1} type="button" />
    <div className="absolute inset-x-0 top-full z-40 border-b border-slate-700 bg-slate-900 shadow-xl md:hidden" id="mobile-menu"><ul className="mx-auto grid max-w-6xl px-4 py-2">{links.map((link) => <li key={link.href}><Link aria-current={isActive(link) ? 'page' : undefined} className={`${itemClass(link)} !py-3 text-base`} href={link.href}>{icon(link)}{link.label}</Link></li>)}</ul></div></> : null}
  </header>;
}
