'use client';

import { useEffect, useState } from 'react';

export function PixelAnimation({ ariaLabel, fallback, frameHeight, frameMs = 100, frames, loop = false, sheet, size = 64 }: { ariaLabel?: string; fallback: string; frameHeight?: number; frameMs?: number; frames: number; loop?: boolean; sheet: string; size?: number }) {
  const [frame, setFrame] = useState(0);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches || document.documentElement.dataset.motion === 'reduced');
    update(); media.addEventListener('change', update); window.addEventListener('field-shift:prefs', update);
    return () => { media.removeEventListener('change', update); window.removeEventListener('field-shift:prefs', update); };
  }, []);
  useEffect(() => {
    if (reduced || frames <= 1) return;
    const timer = window.setInterval(() => setFrame((current) => {
      if (current + 1 < frames) return current + 1;
      if (loop) return 0;
      window.clearInterval(timer);
      return current;
    }), frameMs);
    return () => window.clearInterval(timer);
  }, [frameMs, frames, loop, reduced]);
  const height = frameHeight ?? size;
  return <span aria-label={ariaLabel} aria-hidden={ariaLabel ? undefined : true} className="inline-block shrink-0 bg-no-repeat [image-rendering:pixelated]" role={ariaLabel ? 'img' : undefined} style={{ width: size, height, backgroundImage: `url(${reduced ? fallback : sheet})`, backgroundPosition: reduced ? '0 0' : `${-frame * size}px 0`, backgroundSize: reduced ? `${size}px ${height}px` : `${frames * size}px ${height}px` }} />;
}
