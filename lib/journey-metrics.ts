const KEY = 'field-shift:journey-metrics';
export type JourneyMetrics = { version: 1; startedAt: string | null; lastSeenAt: string; visits: Record<string, number>; completedAnalyses: number; lastCompletionSeconds: number | null };

const empty = (): JourneyMetrics => ({ version: 1, startedAt: null, lastSeenAt: new Date().toISOString(), visits: {}, completedAnalyses: 0, lastCompletionSeconds: null });

export function readJourneyMetrics(): JourneyMetrics {
  if (typeof window === 'undefined') return empty();
  try {
    const value = JSON.parse(window.localStorage.getItem(KEY) ?? '') as Partial<JourneyMetrics>;
    if (value.version !== 1 || typeof value.visits !== 'object' || !value.visits) return empty();
    return { version: 1, startedAt: value.startedAt ?? null, lastSeenAt: value.lastSeenAt ?? new Date().toISOString(), visits: value.visits, completedAnalyses: value.completedAnalyses ?? 0, lastCompletionSeconds: value.lastCompletionSeconds ?? null };
  } catch { return empty(); }
}

export function recordJourneyVisit(pathname: string): void {
  if (typeof window === 'undefined') return;
  const current = readJourneyMetrics();
  const now = new Date();
  const startedAt = current.startedAt ?? (pathname === '/explore' ? now.toISOString() : null);
  const next: JourneyMetrics = { ...current, startedAt, lastSeenAt: now.toISOString(), visits: { ...current.visits, [pathname]: (current.visits[pathname] ?? 0) + 1 } };
  window.localStorage.setItem(KEY, JSON.stringify(next));
}

export function recordJourneyCompletion(): void {
  if (typeof window === 'undefined' || window.sessionStorage.getItem(`${KEY}:completed`) === 'true') return;
  const current = readJourneyMetrics();
  const now = new Date();
  const elapsed = current.startedAt ? Math.max(0, Math.round((now.getTime() - Date.parse(current.startedAt)) / 1000)) : null;
  window.localStorage.setItem(KEY, JSON.stringify({ ...current, lastSeenAt: now.toISOString(), completedAnalyses: current.completedAnalyses + 1, lastCompletionSeconds: elapsed } satisfies JourneyMetrics));
  window.sessionStorage.setItem(`${KEY}:completed`, 'true');
}

export function clearJourneyMetrics(): void { if (typeof window !== 'undefined') window.localStorage.removeItem(KEY); }
