import { z } from 'zod';
import { analysisInputSchema, type AnalysisInput } from '@/lib/schema';

const DRAFT_KEY = 'field-shift:draft';
const v2DraftSchema = z.object({ version: z.literal(2), savedAt: z.string().datetime(), data: analysisInputSchema, legacy: z.record(z.string(), z.unknown()).optional() });
export type Draft = z.infer<typeof v2DraftSchema>;

/** Converts only validated V1 content. Unknown V1 fields stay in `legacy` until a V2 save succeeds. */
export function migrateV1Draft(raw: unknown): Draft | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined;
  const record = raw as Record<string, unknown>;
  if (record.version !== 1 || typeof record.savedAt !== 'string') return undefined;
  const data = analysisInputSchema.safeParse(record.data);
  if (!data.success || Number.isNaN(Date.parse(record.savedAt))) return undefined;
  // Retain the complete raw V1 payload, not merely unknown top-level keys. This
  // prevents loss of an extension nested inside a historical event or soil value.
  return { version: 2, savedAt: record.savedAt, data: data.data, legacy: { v1: record } };
}

export function loadDraft(): Draft | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw: unknown = JSON.parse(window.localStorage.getItem(DRAFT_KEY) ?? '');
    const v2 = v2DraftSchema.safeParse(raw);
    return v2.success ? v2.data : migrateV1Draft(raw);
  } catch { return undefined; }
}

/** Writes V2 only after form validation succeeds; callers may pass migrated opaque fields back unchanged. */
export function saveDraft(data: AnalysisInput, legacy?: Draft['legacy']): void {
  window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ version: 2, savedAt: new Date().toISOString(), data, ...(legacy ? { legacy } : {}) }));
}

export function clearDraft(): void { window.localStorage.removeItem(DRAFT_KEY); }
