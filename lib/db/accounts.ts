import { createHash, randomBytes } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { hashPassword, verifyPassword } from '@/lib/auth/password';

export type User = { id: number; username: string; createdAt: string };
type UserRow = { id: number; username: string; password_hash: string; created_at: string };

export const SESSION_DAYS = 30;
const toUser = (row: Pick<UserRow, 'id' | 'username' | 'created_at'>): User => ({ id: row.id, username: row.username, createdAt: row.created_at });
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

/** Creates an account, or returns `taken` when the username (case-insensitive) already exists. */
export async function createUser(db: DatabaseSync, username: string, password: string, now = new Date()): Promise<User | 'taken'> {
  if (db.prepare('SELECT 1 FROM users WHERE username = ?').get(username)) return 'taken';
  const createdAt = now.toISOString();
  const result = db.prepare('INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)').run(username, await hashPassword(password), createdAt);
  return { id: Number(result.lastInsertRowid), username, createdAt };
}

/** The same answer for a wrong username and a wrong password, so the login does not say which one failed. */
export async function checkLogin(db: DatabaseSync, username: string, password: string): Promise<User | null> {
  const row = db.prepare('SELECT id, username, password_hash, created_at FROM users WHERE username = ?').get(username) as UserRow | undefined;
  // Hash against a dummy when the user does not exist, so both paths cost about the same.
  const ok = await verifyPassword(password, row?.password_hash ?? 'scrypt$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=');
  return row && ok ? toUser(row) : null;
}

/** A random session token. Only its SHA-256 is stored, so a copy of the database cannot be used to sign in. */
export function createSession(db: DatabaseSync, userId: number, now = new Date()): { token: string; expiresAt: Date } {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(now.getTime() + SESSION_DAYS * 86_400_000);
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(now.toISOString());
  db.prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(hashToken(token), userId, now.toISOString(), expiresAt.toISOString());
  return { token, expiresAt };
}

export function userFromToken(db: DatabaseSync, token: string, now = new Date()): User | null {
  const row = db.prepare('SELECT u.id, u.username, u.created_at FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?').get(hashToken(token), now.toISOString()) as UserRow | undefined;
  return row ? toUser(row) : null;
}

export function deleteSession(db: DatabaseSync, token: string): void {
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
}
