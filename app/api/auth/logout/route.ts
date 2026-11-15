import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/connection';
import { deleteSession } from '@/lib/db/accounts';
import { clearSessionCookie, sessionToken } from '@/lib/auth/session';

export const runtime = 'nodejs';

export async function POST() {
  const token = await sessionToken();
  if (token) deleteSession(getDb(), token);
  const response = NextResponse.json({ status: 'ok' });
  clearSessionCookie(response);
  return response;
}
