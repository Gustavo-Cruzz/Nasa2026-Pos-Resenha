import { z } from 'zod';
import { analysisInputSchema } from '@/lib/schema';

const DRAFT_KEY = 'field-shift:draft';
const draftSchema = z.object({ version: z.literal(1), savedAt: z.string().datetime(), data: analysisInputSchema });
export type Draft = z.infer<typeof draftSchema>;
export function loadDraft(): Draft | undefined { if (typeof window === 'undefined') return undefined; try { return draftSchema.safeParse(JSON.parse(window.localStorage.getItem(DRAFT_KEY) ?? '')).data; } catch { return undefined; } }
export function saveDraft(data: Draft['data']): void { window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ version: 1, savedAt: new Date().toISOString(), data })); }
export function clearDraft(): void { window.localStorage.removeItem(DRAFT_KEY); }
