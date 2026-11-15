import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const KEY_LENGTH = 32;
const derive = (password: string, salt: Buffer) => new Promise<Buffer>((resolve, reject) => scrypt(password, salt, KEY_LENGTH, (error, key) => (error ? reject(error) : resolve(key))));

/** Salted scrypt. The demo login has no email or recovery, but the password is still never stored in the clear. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString('base64')}$${(await derive(password, salt)).toString('base64')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltB64, keyB64] = stored.split('$');
  if (scheme !== 'scrypt' || !saltB64 || !keyB64) return false;
  const expected = Buffer.from(keyB64, 'base64');
  const actual = await derive(password, Buffer.from(saltB64, 'base64'));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
