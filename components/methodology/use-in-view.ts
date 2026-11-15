'use client';

import { useEffect, useRef, useState } from 'react';

/** True once the element has scrolled into view, so entry animations play when the reader actually sees them. */
export function useInView<T extends Element>() {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (typeof IntersectionObserver === 'undefined') { const id = window.setTimeout(() => setInView(true), 0); return () => window.clearTimeout(id); }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) { setInView(true); observer.disconnect(); }
    }, { threshold: 0.25 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return { ref, inView };
}
