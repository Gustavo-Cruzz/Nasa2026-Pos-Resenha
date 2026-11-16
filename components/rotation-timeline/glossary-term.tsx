'use client';

import { useId, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useLocale } from '@/components/locale-provider';
import { glossaryText, type GlossaryKey } from '@/lib/rotation-timeline/glossary';

/** Dotted glossary term: focusable, shows a role="tooltip" on hover/focus and closes with Escape. */
export function Term({ k, children }: { k: GlossaryKey; children: ReactNode }) {
  const { locale } = useLocale();
  const id = useId();
  const [anchor, setAnchor] = useState<{ left: number; top: number } | null>(null);
  const show = (element: HTMLElement) => { const rect = element.getBoundingClientRect(); setAnchor({ left: Math.max(8, Math.min(rect.left, window.innerWidth - 276)), top: rect.bottom + 6 }); };
  return <>
    <button
      aria-describedby={anchor ? id : undefined}
      className="cursor-help border-x-0 border-t-0 border-b border-dotted border-cyan-300 bg-transparent p-0 text-left text-inherit outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime-300"
      type="button"
      onBlur={() => setAnchor(null)}
      onFocus={(event) => show(event.currentTarget)}
      onKeyDown={(event) => { if (event.key === 'Escape') setAnchor(null); }}
      onMouseEnter={(event) => show(event.currentTarget)}
      onMouseLeave={() => setAnchor(null)}
    >{children}</button>
    {anchor ? createPortal(<span className="fixed z-[100] w-64 rounded-lg border border-cyan-300 bg-slate-950 p-2.5 text-xs font-normal leading-snug text-slate-100 shadow-xl" id={id} role="tooltip" style={{ left: anchor.left, top: anchor.top }}>{glossaryText(k, locale)}</span>, document.body) : null}
  </>;
}
