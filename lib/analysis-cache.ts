import type { AnalysisResult } from '@/lib/engine/types';

const KEY = 'field-shift:last-analysis';
export type CachedAnalysis = { savedAt: string; data: AnalysisResult };

/** Keeps the latest server analysis so the app can still show it without network. Failure to store is harmless. */
export function saveLastAnalysis(data: AnalysisResult): void {
  try { window.localStorage.setItem(KEY, JSON.stringify({ version: 1, savedAt: new Date().toISOString(), data })); } catch { /* quota or blocked storage */ }
}

export function isAnalysisShape(value: unknown): value is AnalysisResult {
  const record = value as Record<string, unknown> | null;
  return typeof record === 'object' && record !== null && Array.isArray(record.strategies) && typeof record.climate === 'object' && record.climate !== null && typeof record.input === 'object' && record.input !== null && Array.isArray(record.nasaInsightByMonth) && typeof record.evidenceManifest === 'object' && record.evidenceManifest !== null && typeof record.boundaryAnalysis === 'object' && record.boundaryAnalysis !== null;
}

export function loadLastAnalysis(): CachedAnalysis | undefined {
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) ?? 'null') as { version?: number; savedAt?: unknown; data?: unknown } | null;
    if (!raw || raw.version !== 1 || typeof raw.savedAt !== 'string' || Number.isNaN(Date.parse(raw.savedAt)) || !isAnalysisShape(raw.data)) return undefined;
    return { savedAt: raw.savedAt, data: raw.data };
  } catch { return undefined; }
}

export function clearLastAnalysis(): void { try { window.localStorage.removeItem(KEY); } catch { /* ignore */ } }
