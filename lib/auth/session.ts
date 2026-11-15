import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/connection';
import { userFromToken, type User } from '@/lib/db/accounts';

export const SESSION_COOKIE = 'plantae_session';

/** The signed-in user for this request, read from the session cookie, or null. */
export async function currentUser(): Promise<User | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? userFromToken(getDb(), token) : null;
}

export async function sessionToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

const cookieBase = { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' } as const;

export function setSessionCookie(response: NextResponse, token: string, expiresAt: Date): void {
  response.cookies.set(SESSION_COOKIE, token, { ...cookieBase, expires: expiresAt });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE, '', { ...cookieBase, maxAge: 0 });
}

/** Login attempts per client, in memory: 8 failures in 10 minutes blocks that client for the rest of the window. */
const attempts = new Map<string, { failures: number; resetAt: number }>();
export function loginBlocked(key: string, now = Date.now()): boolean {
  const entry = attempts.get(key);
  return Boolean(entry && entry.resetAt > now && entry.failures >= 8);
}
export function recordLoginFailure(key: string, now = Date.now()): void {
  const entry = attempts.get(key);
  if (!entry || entry.resetAt <= now) attempts.set(key, { failures: 1, resetAt: now + 600_000 });
  else entry.failures += 1;
}
export function clearLoginFailures(key: string): void { attempts.delete(key); }
