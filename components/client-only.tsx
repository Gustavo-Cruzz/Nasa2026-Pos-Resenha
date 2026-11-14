'use client';

import { useSyncExternalStore, type ReactNode } from 'react';

const subscribe = () => () => {};

/** Renders children only after hydration. For screens that read `localStorage` while building their initial state, so server and client HTML never differ. */
export function ClientOnly({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  const ready = useSyncExternalStore(subscribe, () => true, () => false);
  return ready ? children : fallback;
}
