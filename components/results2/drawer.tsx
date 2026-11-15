import type { ReactNode } from 'react';

/** Status tones. Cyan = observed within a documented range, amber = attention, slate = unknown/neutral; never a green approval seal. */
export type Tone = 'ok' | 'attention' | 'info';
const TONE: Record<Tone, string> = { ok: 'border-cyan-300/40 bg-cyan-300/10 text-cyan-200', attention: 'border-amber-300/50 bg-amber-300/10 text-amber-200', info: 'border-slate-500 bg-slate-700/40 text-slate-200' };

export function Chip({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-xs font-bold ${TONE[tone]}`}>{children}</span>;
}
