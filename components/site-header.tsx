import Link from 'next/link';
import { Sprout } from 'lucide-react';
import { defaultLocale, dictionaries } from '@/lib/i18n';

export function SiteHeader() {
  const copy = dictionaries[defaultLocale];
  return <header className="border-b border-slate-800"><nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4" aria-label="Navegação principal"><Link className="flex items-center gap-2 font-bold text-lime-300" href="/"><Sprout aria-hidden="true" size={22} />{copy.productName}</Link><div className="flex flex-wrap items-center gap-4 text-sm"><Link href="/explore">{copy.explore}</Link><Link href="/farm">Minha fazenda</Link><Link href="/lab">Laboratório</Link><Link href="/results">Comparar</Link><Link href="/methodology">{copy.methodology}</Link></div></nav></header>;
}
