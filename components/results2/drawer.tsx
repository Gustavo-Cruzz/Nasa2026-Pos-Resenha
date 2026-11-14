import type { ReactNode } from 'react';
import { ChevronDown, Lightbulb } from 'lucide-react';

export type Tone = 'ok' | 'attention' | 'info';
const TONE: Record<Tone, string> = { ok: 'border-cyan-300/40 bg-cyan-300/10 text-cyan-200', attention: 'border-amber-300/50 bg-amber-300/10 text-amber-200', info: 'border-slate-500 bg-slate-700/40 text-slate-200' };

export function Chip({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-xs font-bold ${TONE[tone]}`}>{children}</span>;
}

/** One theme drawer: a closed header with icon, title, one-line takeaway and status chip; opens to an explanation plus a visual. */
export function Drawer({ icon, title, takeaway, status, tone, defaultOpen, children }: { icon: ReactNode; title: string; takeaway: string; status: string; tone: Tone; defaultOpen?: boolean; children: ReactNode }) {
  return <details className="group rounded-2xl border border-slate-700 bg-slate-900/70 open:border-slate-500" open={defaultOpen}>
    <summary className="flex cursor-pointer list-none items-center gap-3 p-4 sm:p-5 [&::-webkit-details-marker]:hidden">
      <span aria-hidden="true" className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-slate-800 text-lime-200">{icon}</span>
      <span className="min-w-0 flex-1"><span className="block text-lg font-bold leading-tight">{title}</span><span className="mt-0.5 block text-sm text-slate-300">{takeaway}</span></span>
      <Chip tone={tone}>{status}</Chip>
      <ChevronDown aria-hidden="true" className="shrink-0 text-slate-400 transition-transform group-open:rotate-180" size={22} />
    </summary>
    <div className="grid gap-6 border-t border-slate-700 p-4 sm:p-5 lg:grid-cols-[1fr_1.2fr]">{children}</div>
  </details>;
}

/** "In plain words" side of a drawer. */
export function Explain({ words, points, limit }: { words: string; points?: string[]; limit?: string }) {
  return <div>
    <p className="flex items-center gap-2 text-sm font-bold text-lime-200"><Lightbulb aria-hidden="true" size={16} />Em palavras simples</p>
    <p className="mt-2 leading-relaxed text-slate-200">{words}</p>
    {points ? <ul className="mt-3 grid gap-2 text-sm text-slate-300">{points.map((point) => <li className="flex gap-2" key={point}><span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-lime-300" />{point}</li>)}</ul> : null}
    {limit ? <p className="mt-4 rounded-lg border border-slate-700 bg-slate-950/50 p-3 text-xs text-slate-400"><b className="text-slate-300">O que isto não diz: </b>{limit}</p> : null}
  </div>;
}
