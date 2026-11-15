import { describe, expect, it } from 'vitest';
import { openDb } from '@/lib/db/connection';
import { checkLogin, createSession, createUser, deleteSession, userFromToken } from '@/lib/db/accounts';
import { getFarm, saveFarm } from '@/lib/db/farms';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { credentialsSchema, farmPayloadSchema, type FarmPayload } from '@/lib/farm/schema';

const input = {
  location: { latitude: -17.798, longitude: -50.919 },
  plantingMonth: 10,
  history: [
    { cropId: 'soybean', startYearMonth: '2023-10', endYearMonth: '2024-02' },
    { cropId: 'maize', startYearMonth: '2024-02', endYearMonth: '2024-06' },
  ],
  priorities: { water: 2, soil: 3, operations: 1 },
  irrigation: 'unknown' as const,
  soilObservation: { kinds: ['waterlogging' as const, 'compaction' as const], note: 'Empoça perto da sede.' },
  fieldBoundary: [[-50.92, -17.79], [-50.91, -17.79], [-50.91, -17.80]] as Array<[number, number]>,
};
const payload = (overrides: Partial<FarmPayload> = {}): FarmPayload => farmPayloadSchema.parse({ name: 'Fazenda Boa Vista', placeLabel: 'Rio Verde (GO)', input, ...overrides });

describe('password hashing', () => {
  it('verifies the right password, rejects the wrong one, and never stores it in the clear', async () => {
    const stored = await hashPassword('segredo123');
    expect(stored.startsWith('scrypt$')).toBe(true);
    expect(stored).not.toContain('segredo123');
    expect(await verifyPassword('segredo123', stored)).toBe(true);
    expect(await verifyPassword('outra-senha', stored)).toBe(false);
    expect(await verifyPassword('x', 'not-a-hash')).toBe(false);
  });
  it('salts: the same password hashes differently each time', async () => { expect(await hashPassword('abcdef')).not.toBe(await hashPassword('abcdef')); });
});

describe('credentials', () => {
  it('accepts a short username and a 6+ character password, and explains what is wrong otherwise', () => {
    expect(credentialsSchema.safeParse({ username: 'maria.silva', password: 'abcdef' }).success).toBe(true);
    expect(credentialsSchema.safeParse({ username: 'ab', password: 'abcdef' }).success).toBe(false);
    expect(credentialsSchema.safeParse({ username: 'com espaço', password: 'abcdef' }).success).toBe(false);
    const short = credentialsSchema.safeParse({ username: 'maria', password: '123' });
    expect(short.success ? '' : short.error.issues[0].message).toContain('6 caracteres');
  });
});

describe('accounts and sessions', () => {
  it('creates a user, blocks a duplicate in any letter case, and logs in with the right password only', async () => {
    const db = openDb(':memory:');
    const user = await createUser(db, 'Maria', 'abcdef');
    expect(user).toMatchObject({ username: 'Maria' });
    expect(await createUser(db, 'maria', 'outra123')).toBe('taken');
    expect(await checkLogin(db, 'MARIA', 'abcdef')).toMatchObject({ username: 'Maria' });
    expect(await checkLogin(db, 'maria', 'errada')).toBeNull();
    expect(await checkLogin(db, 'ninguem', 'abcdef')).toBeNull();
  });
  it('keeps only a hash of the session token, expires it, and deletes it on logout', async () => {
    const db = openDb(':memory:');
    const user = await createUser(db, 'joao', 'abcdef');
    if (user === 'taken') throw new Error('unexpected');
    const now = new Date('2026-11-15T12:00:00Z');
    const session = createSession(db, user.id, now);
    const stored = (db.prepare('SELECT token_hash FROM sessions').get() as { token_hash: string }).token_hash;
    expect(stored).not.toBe(session.token);
    expect(userFromToken(db, session.token, now)).toMatchObject({ username: 'joao' });
    expect(userFromToken(db, 'forged-token', now)).toBeNull();
    expect(userFromToken(db, session.token, new Date(session.expiresAt.getTime() + 1000))).toBeNull();
    deleteSession(db, session.token);
    expect(userFromToken(db, session.token, now)).toBeNull();
  });
});

describe('farms', () => {
  async function owner() {
    const db = openDb(':memory:');
    const user = await createUser(db, 'dona.ana', 'abcdef');
    if (user === 'taken') throw new Error('unexpected');
    return { db, user };
  }

  it('saves a farm with its history, soil report and perimeter, and reads it back intact', async () => {
    const { db, user } = await owner();
    expect(getFarm(db, user.id)).toBeNull();
    const saved = saveFarm(db, user.id, payload(), new Date('2026-11-15T12:00:00Z'));
    expect(saved).toMatchObject({ name: 'Fazenda Boa Vista', placeLabel: 'Rio Verde (GO)', createdAt: '2026-11-15T12:00:00.000Z' });
    const read = getFarm(db, user.id);
    expect(read?.input.history.map((event) => event.cropId)).toEqual(['soybean', 'maize']);
    expect(read?.input.soilObservation?.kinds).toEqual(['waterlogging', 'compaction']);
    expect(read?.input.fieldBoundary).toHaveLength(3);
    expect((db.prepare('SELECT COUNT(*) AS n FROM crop_events').get() as { n: number }).n).toBe(2);
  });

  it('keeps one farm per user: saving again updates it and replaces the crop history', async () => {
    const { db, user } = await owner();
    const first = saveFarm(db, user.id, payload(), new Date('2026-11-15T12:00:00Z'));
    const next = saveFarm(db, user.id, payload({ name: 'Sítio Novo', input: { ...input, history: [{ cropId: 'sorghum', startYearMonth: '2025-10', endYearMonth: '2026-03' }] } }), new Date('2026-11-16T12:00:00Z'));
    expect(next.id).toBe(first.id);
    expect(next.createdAt).toBe(first.createdAt);
    expect(next.updatedAt).toBe('2026-11-16T12:00:00.000Z');
    expect((db.prepare('SELECT COUNT(*) AS n FROM farms').get() as { n: number }).n).toBe(1);
    expect((db.prepare('SELECT crop_id FROM crop_events').all() as Array<{ crop_id: string }>).map((row) => row.crop_id)).toEqual(['sorghum']);
    expect(getFarm(db, user.id)?.name).toBe('Sítio Novo');
  });

  it('never shows one user the farm of another', async () => {
    const { db, user } = await owner();
    const other = await createUser(db, 'seu.jose', 'abcdef');
    if (other === 'taken') throw new Error('unexpected');
    saveFarm(db, user.id, payload());
    expect(getFarm(db, other.id)).toBeNull();
  });

  it('refuses an invalid farm before it reaches the database, and drops a row whose stored input no longer validates', async () => {
    expect(farmPayloadSchema.safeParse({ name: '  ', input }).success).toBe(false);
    expect(farmPayloadSchema.safeParse({ name: 'X', input: { ...input, plantingMonth: 13 } }).success).toBe(false);
    const { db, user } = await owner();
    saveFarm(db, user.id, payload());
    db.prepare('UPDATE farms SET input_json = ? WHERE user_id = ?').run('{"location":{"latitude":999}}', user.id);
    expect(getFarm(db, user.id)).toBeNull();
  });

  it('removes the farm and its history when the account is deleted', async () => {
    const { db, user } = await owner();
    saveFarm(db, user.id, payload());
    db.prepare('DELETE FROM users WHERE id = ?').run(user.id);
    expect((db.prepare('SELECT COUNT(*) AS n FROM farms').get() as { n: number }).n).toBe(0);
    expect((db.prepare('SELECT COUNT(*) AS n FROM crop_events').get() as { n: number }).n).toBe(0);
  });
});
