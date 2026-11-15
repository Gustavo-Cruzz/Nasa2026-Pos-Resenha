import Image from 'next/image';
import { JOAO_MOODS, type JoaoMood } from '@/lib/explain/joao-mood';

/**
 * João standing, in the given mood. All moods share one canvas, so changing the mood never moves him.
 * A mood without art falls back to the neutral João and, while developing, carries a "Falta arte" tag.
 */
export function JoaoFigure({ mood, className = 'h-[108px] w-[72px]' }: { mood: JoaoMood; className?: string }) {
  const spec = JOAO_MOODS[mood];
  const missing = spec.src === null;
  const src = spec.src ?? (JOAO_MOODS.neutral.src as string);
  return <span className={`relative inline-block shrink-0 ${className}`} data-mood={mood} data-mood-status={missing ? 'missing' : 'ready'}>
    <Image alt="" aria-hidden="true" className="h-full w-full select-none object-contain object-bottom" height={360} src={src} width={240} />
    {missing && process.env.NODE_ENV !== 'production' ? <span className="absolute inset-x-0 -top-1 rounded bg-amber-300 px-1 py-0.5 text-center text-[10px] font-bold leading-tight text-slate-950">Falta arte: {spec.label}</span> : null}
  </span>;
}

/** João's face (the top of the figure) in a circle, for tight spaces. */
export function JoaoFace({ mood, size = 40 }: { mood: JoaoMood; size?: number }) {
  const src = JOAO_MOODS[mood].src ?? (JOAO_MOODS.neutral.src as string);
  return <span aria-hidden="true" className="relative inline-block shrink-0 overflow-hidden rounded-full border-2 border-lime-300/60 bg-slate-950" style={{ width: size, height: size }}>
    <Image alt="" className="absolute left-1/2 top-0 max-w-none -translate-x-1/2 select-none" height={size * 2.6} src={src} style={{ width: size * 1.74, height: size * 2.6 }} width={size * 1.74} />
  </span>;
}
