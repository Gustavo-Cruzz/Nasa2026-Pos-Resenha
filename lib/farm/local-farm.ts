import type { FarmRecord } from '@/lib/db/farms';
import { analysisInputSchema } from '@/lib/schema';

const KEY = 'field-shift:farm';

/** A copy of the registered farm kept in this browser, so the panel still opens if the server lost the session or its temporary database. */
export function saveLocalFarm(farm: FarmRecord): void {
  try { window.localStorage.setItem(KEY, JSON.stringify(farm)); } catch { /* storage unavailable: the server copy is enough */ }
}

export function loadLocalFarm(): FarmRecord | null {
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) ?? 'null') as Partial<FarmRecord> | null;
    const input = analysisInputSchema.safeParse(raw?.input);
    if (!raw || !input.success || typeof raw.name !== 'string') return null;
    return { id: raw.id ?? 0, name: raw.name, placeLabel: raw.placeLabel ?? null, input: input.data, createdAt: raw.createdAt ?? '', updatedAt: raw.updatedAt ?? '' };
  } catch { return null; }
}
