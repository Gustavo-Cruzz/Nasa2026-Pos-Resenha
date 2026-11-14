'use client';

import { useEffect, useState } from 'react';

export type JsonState<T> = { kind: 'idle' } | { kind: 'loading' } | { kind: 'ready'; data: T } | { kind: 'error' };
type Result<T> = { url: string; data?: T; failed?: boolean };

/** GET a same-origin JSON route. The result is tied to its URL, so a reading for one place is never shown for another. Null URL = idle. */
export function useJson<T>(url: string | null, accept: (body: unknown) => T | undefined): JsonState<T> {
  const [result, setResult] = useState<Result<T>>();
  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    fetch(url)
      .then((response) => response.json() as Promise<unknown>)
      .then((body) => { if (!cancelled) { const data = accept(body); setResult(data === undefined ? { url, failed: true } : { url, data }); } })
      .catch(() => { if (!cancelled) setResult({ url, failed: true }); });
    return () => { cancelled = true; };
    // `accept` is a stable module-level function at every call site.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);
  if (!url) return { kind: 'idle' };
  if (!result || result.url !== url) return { kind: 'loading' };
  return result.data !== undefined ? { kind: 'ready', data: result.data } : { kind: 'error' };
}
