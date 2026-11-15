import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth/session';
import { DB_EPHEMERAL } from '@/lib/db/connection';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Who is signed in (or nobody), and whether the database is the temporary kind. */
export async function GET() {
  const user = await currentUser();
  return NextResponse.json({ status: 'ok', user: user ? { username: user.username } : null, ephemeralDatabase: DB_EPHEMERAL });
}
