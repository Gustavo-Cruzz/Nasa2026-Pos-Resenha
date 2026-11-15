'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { ChevronUp } from 'lucide-react';
import { ChatAvatar } from '@/components/chat/chat-avatar';
import { JoaoNote } from '@/components/joao/joao-note';

export type BlockComment = { happening: string; points?: string[]; limit?: string };

/**
 * Which block is "being shown": the one whose body is closest to a line a little above the middle of the screen,
 * among those actually on screen. It follows the scroll, and a keyboard focus inside a block makes that block the active one.
 */
export function useActiveBlock(ids: string[]): string | null {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = window.innerHeight * 0.42;
      let best: { id: string; distance: number } | null = null;
      for (const id of ids) {
        const element = document.getElementById(`block-${id}`);
        if (!element) continue;
        const rect = element.getBoundingClientRect();
        if (rect.bottom < 96 || rect.top > window.innerHeight - 96) continue;
        const distance = rect.top <= line && rect.bottom >= line ? 0 : Math.min(Math.abs(rect.top - line), Math.abs(rect.bottom - line));
        if (!best || distance < best.distance) best = { id, distance };
      }
      setActive(best ? best.id : null);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const onFocus = (event: FocusEvent) => {
      const id = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-joao-block]')?.id.replace(/^block-/, '');
      if (id && ids.includes(id)) setActive(id);
    };
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    document.addEventListener('focusin', onFocus);
    schedule();
    return () => { if (frame) cancelAnimationFrame(frame); window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule); document.removeEventListener('focusin', onFocus); };
  }, [ids]);
  return active;
}

/**
 * Desktop: João lives in the margin, outside the block, in the cell beside it. He appears only while his block is the one being shown
 * (the others fade out) and follows the scroll inside that block's height. Hidden comments stay readable for screen readers, in order.
 */
export function JoaoRail({ title, comment, active }: { title: string; comment: BlockComment; active: boolean }) {
  return <div className="hidden lg:block">
    <aside aria-label={`Comentário do João sobre ${title}`} className={`sticky top-6 transition-[opacity,transform] duration-300 motion-reduce:transition-none ${active ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0'}`}>
      <div className="relative rounded-2xl border border-lime-300/40 bg-slate-950/90 p-4 text-[0.9375rem] leading-6 shadow-lg">
        <p className="text-xs font-bold uppercase tracking-wide text-lime-200">João sobre: {title}</p>
        <p className="mt-2 text-slate-100">{comment.happening}</p>
        {comment.points?.length ? <ul className="mt-2 grid gap-1.5 text-sm text-slate-300">{comment.points.map((point) => <li className="flex gap-2" key={point}><span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-lime-300" />{point}</li>)}</ul> : null}
        {comment.limit ? <p className="mt-3 rounded-lg border border-slate-700 bg-slate-900/60 p-2.5 text-xs text-slate-400"><b className="text-slate-300">O que isto não diz: </b>{comment.limit}</p> : null}
        <span aria-hidden="true" className="absolute -bottom-1.5 left-12 h-3 w-3 rotate-45 border-b border-r border-lime-300/40 bg-slate-950" />
      </div>
      <Image alt="" aria-hidden="true" className="ml-6 mt-1 h-28 w-auto select-none" height={360} src="/assets/brand/joao-full.webp" width={178} />
    </aside>
  </div>;
}

/**
 * Mobile: there is no margin, so João peeks in from the bottom edge, only while a block is on screen, with a one-line comment
 * about that block. Tapping opens the full comment; it folds again when another block takes over.
 */
export function JoaoDock({ block }: { block: { id: string; title: string; comment: BlockComment } | null }) {
  return block ? <DockBody block={block} key={block.id} /> : null;
}

function DockBody({ block }: { block: { id: string; title: string; comment: BlockComment } }) {
  const [open, setOpen] = useState(false);
  return <div className="joao-in fixed inset-x-3 bottom-3 z-30 lg:hidden">
    {open ? <div className="mb-2 max-h-[55vh] overflow-y-auto rounded-2xl border border-lime-300/40 bg-slate-950/95 p-3 shadow-2xl backdrop-blur"><JoaoNote happening={block.comment.happening} limit={block.comment.limit} points={block.comment.points} /></div> : null}
    <button aria-expanded={open} className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-lime-300/50 bg-slate-950/95 p-3 text-left shadow-2xl backdrop-blur" onClick={() => setOpen((current) => !current)} type="button">
      <ChatAvatar size={40} />
      <span className="min-w-0 flex-1"><span className="block text-xs font-bold text-lime-200">João sobre: {block.title}</span><span className={`text-sm text-slate-200 ${open ? 'block' : 'line-clamp-1'}`}>{block.comment.happening}</span></span>
      <ChevronUp aria-hidden="true" className={`shrink-0 text-slate-400 transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`} size={20} />
    </button>
  </div>;
}
