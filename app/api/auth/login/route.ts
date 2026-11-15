import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/connection';
import { checkLogin, createSession } from '@/lib/db/accounts';
import { clearLoginFailures, loginBlocked, recordLoginFailure, setSessionCookie } from '@/lib/auth/session';
import { credentialsSchema } from '@/lib/farm/schema';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = credentialsSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ status: 'error', code: 'INVALID_CREDENTIALS', message: 'Usuário ou senha inválidos.' }, { status: 401 });
  const key = `${request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local'}|${parsed.data.username.toLowerCase()}`;
  if (loginBlocked(key)) return NextResponse.json({ status: 'error', code: 'TOO_MANY_ATTEMPTS', message: 'Muitas tentativas. Espere alguns minutos e tente de novo.' }, { status: 429 });
  const db = getDb();
  const user = await checkLogin(db, parsed.data.username, parsed.data.password);
  if (!user) { recordLoginFailure(key); return NextResponse.json({ status: 'error', code: 'INVALID_CREDENTIALS', message: 'Usuário ou senha inválidos.' }, { status: 401 }); }
  clearLoginFailures(key);
  const session = createSession(db, user.id);
  const response = NextResponse.json({ status: 'ok', user: { username: user.username } });
  setSessionCookie(response, session.token, session.expiresAt);
  return response;
}
