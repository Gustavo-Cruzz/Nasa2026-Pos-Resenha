'use client';

import Image from 'next/image';
import { useLocale } from '@/components/locale-provider';

export type JoaoNoteTone = 'info' | 'attention' | 'unknown';

/**
 * João's comment next to a block of data: what is happening, and why he says so. The page shows the data;
 * João only explains it. He never tells anyone what to do, and the "what this does not say" line is always kept.
 */
export function JoaoNote({ happening, why, points, limit, tone = 'info' }: { happening: string; why?: string; points?: string[]; limit?: string; tone?: JoaoNoteTone }) {
  const { locale } = useLocale();
  const en = locale === 'en';
  const badge = tone === 'attention' ? (en ? 'Worth noticing' : 'Chama atenção') : tone === 'unknown' ? (en ? 'No data' : 'Sem dado') : null;
  return <aside aria-label={en ? 'João explains' : 'O João explica'} className="order-last mt-3 flex items-start gap-3 first:mt-0">
    <Image alt="" aria-hidden="true" className="h-[108px] w-auto shrink-0 select-none" height={360} src="/assets/brand/joao-full.webp" width={178} />
    <div className={`relative min-w-0 flex-1 rounded-2xl rounded-tl-sm border bg-slate-950/70 p-3.5 text-[0.9375rem] leading-6 ${tone === 'attention' ? 'border-amber-300/50' : 'border-lime-300/30'}`}>
      <span aria-hidden="true" className={`absolute -left-1.5 top-5 h-3 w-3 rotate-45 border-b border-l bg-slate-950 ${tone === 'attention' ? 'border-amber-300/50' : 'border-lime-300/30'}`} />
      <p className="flex flex-wrap items-center gap-2 text-xs font-bold text-lime-200">{en ? 'João explains' : 'João explica'}{badge ? <span className={`rounded px-1.5 py-0.5 ${tone === 'attention' ? 'bg-amber-300/20 text-amber-100' : 'bg-slate-800 text-slate-300'}`}>{badge}</span> : null}</p>
      <p className="mt-1 text-slate-100">{happening}</p>
      {points?.length ? <ul className="mt-2 grid gap-1.5 text-sm text-slate-300">{points.map((point) => <li className="flex gap-2" key={point}><span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-lime-300" />{point}</li>)}</ul> : null}
      {why ? <p className="mt-2 text-sm text-slate-300"><b className="text-slate-200">{en ? 'Why I say this: ' : 'Por que eu digo isso: '}</b>{why}</p> : null}
      {limit ? <p className="mt-3 rounded-lg border border-slate-700 bg-slate-900/60 p-2.5 text-xs text-slate-400"><b className="text-slate-300">{en ? 'What this does not say: ' : 'O que isto não diz: '}</b>{limit}</p> : null}
    </div>
  </aside>;
}
