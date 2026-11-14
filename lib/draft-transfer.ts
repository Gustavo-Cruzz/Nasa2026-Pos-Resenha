import { migrateV1Draft, v2DraftSchema, type Draft } from '@/lib/storage';

export const DRAFT_FILE_MAX_CHARS = 500_000;
export type DraftImportError = 'too_large' | 'invalid_json' | 'not_a_draft';
export type DraftImportResult = { ok: true; draft: Draft } | { ok: false; code: DraftImportError };

const messages = {
  'pt-BR': { too_large: 'Arquivo grande demais para ser um rascunho do Plantaê.', invalid_json: 'O arquivo não é um JSON válido.', not_a_draft: 'O arquivo não é um rascunho válido do Plantaê. Nada foi alterado.' },
  en: { too_large: 'File too large to be a Plantaê draft.', invalid_json: 'The file is not valid JSON.', not_a_draft: 'The file is not a valid Plantaê draft. Nothing was changed.' },
} as const;
export const draftImportMessage = (code: DraftImportError, locale: 'pt-BR' | 'en') => messages[locale][code];

/** Portable file: the validated V2 draft wrapped with an app marker so other JSON files are rejected early. */
export function serializeDraft(draft: Draft): string {
  return JSON.stringify({ app: 'field-shift', kind: 'draft', exportedAt: new Date().toISOString(), draft }, null, 2);
}

export function parseDraftFile(text: string): DraftImportResult {
  if (text.length > DRAFT_FILE_MAX_CHARS) return { ok: false, code: 'too_large' };
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { return { ok: false, code: 'invalid_json' }; }
  const inner = typeof raw === 'object' && raw !== null && (raw as Record<string, unknown>).app === 'field-shift' && (raw as Record<string, unknown>).kind === 'draft' ? (raw as Record<string, unknown>).draft : undefined;
  const v2 = v2DraftSchema.safeParse(inner);
  if (v2.success) return { ok: true, draft: v2.data };
  const migrated = migrateV1Draft(inner);
  return migrated ? { ok: true, draft: migrated } : { ok: false, code: 'not_a_draft' };
}
