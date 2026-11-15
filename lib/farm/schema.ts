import { z } from 'zod';
import { analysisInputSchema } from '@/lib/schema';
import type { Locale } from '@/lib/i18n';

/** Demo accounts: a short username and a password of at least 6 characters. No email, no recovery. */
export const usernameSchema = z.string().trim().min(3, 'The username needs at least 3 characters.').max(24, 'The username can have at most 24 characters.').regex(/^[a-zA-Z0-9_.-]+$/, 'Use only letters, numbers, dot, hyphen and underscore.');
export const passwordSchema = z.string().min(6, 'The password needs at least 6 characters.').max(72, 'The password can have at most 72 characters.');
export const credentialsSchema = z.object({ username: usernameSchema, password: passwordSchema });

/** What the registration sends: the farm's name, a label for its place, and the same validated input the analysis uses. */
export const farmPayloadSchema = z.object({
  name: z.string().trim().min(1, 'Give the farm a name.').max(80, 'The name can have at most 80 characters.'),
  placeLabel: z.string().trim().max(120).optional(),
  input: analysisInputSchema,
});
export type FarmPayload = z.infer<typeof farmPayloadSchema>;

const MESSAGES_PT: Record<string, string> = {
  'The username needs at least 3 characters.': 'O usuário precisa de pelo menos 3 caracteres.',
  'The username can have at most 24 characters.': 'O usuário pode ter no máximo 24 caracteres.',
  'Use only letters, numbers, dot, hyphen and underscore.': 'Use só letras, números, ponto, hífen e sublinhado.',
  'The password needs at least 6 characters.': 'A senha precisa de pelo menos 6 caracteres.',
  'The password can have at most 72 characters.': 'A senha pode ter no máximo 72 caracteres.',
  'Give the farm a name.': 'Dê um nome à fazenda.',
  'The name can have at most 80 characters.': 'O nome pode ter no máximo 80 caracteres.',
};
/** Validation messages are written in English; this returns the Portuguese version for pt-BR (unknown messages pass through). */
export const schemaMessage = (message: string, locale: Locale = 'en'): string => (locale === 'en' ? message : MESSAGES_PT[message] ?? message);
