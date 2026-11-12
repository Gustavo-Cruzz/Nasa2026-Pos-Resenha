'use client';

import Link from 'next/link';
import { Sprout } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useLocale } from '@/components/locale-provider';
import { LocaleSwitcher } from '@/components/locale-switcher';

export function SiteHeader() {
  const { copy } = useLocale();
  const pathname = usePathname();
  const links = [{ href: '/explore', label: copy.explore }, { href: '/farm', label: copy.farm }, { href: '/lab', label: copy.lab }, { href: '/results', label: copy.compare }, { href: '/methodology', label: copy.methodology }];
  return <header className="border-b border-slate-800"><nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4" aria-label="Navegação principal"><Link className="flex items-center gap-2 font-bold text-lime-300" href="/"><Sprout aria-hidden="true" size={22} />{copy.productName}</Link><div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">{links.map((link) => <Link aria-current={pathname === link.href ? 'page' : undefined} className={pathname === link.href ? 'font-bold text-lime-200 underline' : 'hover:text-lime-200 hover:underline'} href={link.href} key={link.href}>{link.label}</Link>)}<LocaleSwitcher /></div></nav></header>;
}
