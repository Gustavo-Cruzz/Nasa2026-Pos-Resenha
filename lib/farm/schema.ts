import { z } from 'zod';
import { analysisInputSchema } from '@/lib/schema';

/** Demo accounts: a short username and a password of at least 6 characters. No email, no recovery. */
export const usernameSchema = z.string().trim().min(3, 'O usuário precisa de pelo menos 3 caracteres.').max(24, 'O usuário pode ter no máximo 24 caracteres.').regex(/^[a-zA-Z0-9_.-]+$/, 'Use só letras, números, ponto, hífen e sublinhado.');
export const passwordSchema = z.string().min(6, 'A senha precisa de pelo menos 6 caracteres.').max(72, 'A senha pode ter no máximo 72 caracteres.');
export const credentialsSchema = z.object({ username: usernameSchema, password: passwordSchema });

/** What the registration sends: the farm's name, a label for its place, and the same validated input the analysis uses. */
export const farmPayloadSchema = z.object({
  name: z.string().trim().min(1, 'Dê um nome à fazenda.').max(80, 'O nome pode ter no máximo 80 caracteres.'),
  placeLabel: z.string().trim().max(120).optional(),
  input: analysisInputSchema,
});
export type FarmPayload = z.infer<typeof farmPayloadSchema>;
