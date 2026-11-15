'use client';
import { CircleStop, Play } from 'lucide-react';
import { useLocale } from '@/components/locale-provider';
import { usePageReader } from './use-page-reader';

export function PageReader({ targetId }: { targetId: string }) {
  const { locale } = useLocale(); const en = locale === 'en'; const { state, supported, start, stop } = usePageReader(targetId);
  if (!supported) return null;
  return <div aria-label={en ? 'Page reader' : 'Leitor da página'} className="flex items-center gap-0.5 rounded-lg border border-slate-700/80 bg-slate-900/50 p-0.5" role="group">
    <button aria-label={en ? 'Read page' : 'Ler página'} className="grid h-9 w-9 place-items-center rounded-md text-slate-300 hover:bg-slate-800 hover:text-lime-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime-300" onClick={start} title={en ? 'Read page' : 'Ler página'} type="button"><Play aria-hidden="true" size={16} /></button>
    <button aria-label={en ? 'Stop reading' : 'Parar leitura'} className="grid h-9 w-9 place-items-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime-300 disabled:cursor-not-allowed disabled:opacity-35" disabled={state === 'idle'} onClick={stop} title={en ? 'Stop reading' : 'Parar leitura'} type="button"><CircleStop aria-hidden="true" size={16} /></button>
    <span aria-live="polite" className="sr-only">{state === 'reading' ? (en ? 'Reading page.' : 'Lendo a página.') : ''}</span>
  </div>;
}
