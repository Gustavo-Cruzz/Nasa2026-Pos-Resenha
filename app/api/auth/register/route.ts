import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/connection';
import { createSession, createUser } from '@/lib/db/accounts';
import { setSessionCookie } from '@/lib/auth/session';
import { credentialsSchema } from '@/lib/farm/schema';

export const runtime = 'nodejs';

/** Demo sign-up: a username and a password, nothing else. Signs the new user in. */
export async function POST(request: NextRequest) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = credentialsSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ status: 'error', code: 'INVALID_CREDENTIALS', message: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }, { status: 422 });
  const db = getDb();
  const user = await createUser(db, parsed.data.username, parsed.data.password);
  if (user === 'taken') return NextResponse.json({ status: 'error', code: 'USERNAME_TAKEN', message: 'Esse usuário já existe. Escolha outro ou entre.' }, { status: 409 });
  const session = createSession(db, user.id);
  const response = NextResponse.json({ status: 'ok', user: { username: user.username } }, { status: 201 });
  setSessionCookie(response, session.token, session.expiresAt);
  return response;
}
