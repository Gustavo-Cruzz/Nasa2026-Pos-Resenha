'use client';

import { useEffect, useState } from 'react';

export function ReviewTransition() {
  const [frame, setFrame] = useState(0);
  const [reduced, setReduced] = useState(false);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (window.sessionStorage.getItem('field-shift:review-transition-seen')) return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const revealTimer = window.setTimeout(() => { window.sessionStorage.setItem('field-shift:review-transition-seen', 'true'); setReduced(media.matches); setVisible(true); }, 0);
    if (media.matches) return () => window.clearTimeout(revealTimer);
    let current = 0;
    const timer = window.setInterval(() => { current += 1; setFrame(current); if (current >= 7) window.clearInterval(timer); }, 100);
    return () => { window.clearInterval(timer); window.clearTimeout(revealTimer); };
  }, []);
  if (!visible) return null;
  return <div aria-label="Transição decorativa: três hipóteses entram em revisão, sem indicar uma vencedora" className="mx-auto aspect-video w-full max-w-lg rounded-xl border border-slate-700 bg-no-repeat [image-rendering:pixelated]" role="img" style={{ backgroundImage: `url(${reduced ? '/assets/transitions/transition-review-static.png' : '/assets/transitions/transition-review-sheet.png'})`, backgroundPosition: reduced ? '0 0' : `${frame / 7 * 100}% 0`, backgroundSize: reduced ? '100% 100%' : '800% 100%' }} />;
}
