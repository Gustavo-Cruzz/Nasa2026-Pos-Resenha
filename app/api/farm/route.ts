import { NextRequest, NextResponse } from 'next/server';
import { currentUser, setSessionCookie } from '@/lib/auth/session';
import { createGuestUser, createSession } from '@/lib/db/accounts';
import { getDb } from '@/lib/db/connection';
import { getFarm, saveFarm } from '@/lib/db/farms';
import { farmPayloadSchema } from '@/lib/farm/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const unauthorized = () => NextResponse.json({ status: 'error', code: 'NOT_SIGNED_IN', message: 'Sign in to see your farm.' }, { status: 401 });

/** The signed-in user's farm (or null when none is registered yet). */
export async function GET() {
  const user = await currentUser();
  if (!user) return unauthorized();
  return NextResponse.json({ status: 'ok', farm: getFarm(getDb(), user.id) });
}

/** Registers the farm, or updates it. Without a session a guest account is created on the spot: no sign-up is needed. */
export async function PUT(request: NextRequest) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = farmPayloadSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ status: 'error', code: 'INVALID_FARM', message: parsed.error.issues[0]?.message ?? 'Invalid farm data.' }, { status: 422 });
  const db = getDb();
  let user = await currentUser();
  let session: { token: string; expiresAt: Date } | undefined;
  if (!user) {
    user = await createGuestUser(db);
    session = createSession(db, user.id);
  }
  const response = NextResponse.json({ status: 'ok', farm: saveFarm(db, user.id, parsed.data) });
  if (session) setSessionCookie(response, session.token, session.expiresAt);
  return response;
}
