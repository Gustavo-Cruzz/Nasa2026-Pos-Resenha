import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * SQLite through Node's built-in `node:sqlite` (Node 22.13+): no native dependency to build.
 * The database holds the demo accounts and the registered farms. It is a hackathon store, not a hardened one.
 */

/** On Vercel the disk is temporary: without an explicit PLANTAE_DB_PATH the file lives in /tmp and can disappear between runs. */
export const DB_EPHEMERAL = Boolean(process.env.VERCEL) && !process.env.PLANTAE_DB_PATH;

export function dbPath(): string {
  if (process.env.PLANTAE_DB_PATH) return process.env.PLANTAE_DB_PATH;
  return process.env.VERCEL ? '/tmp/plantae.sqlite' : join(process.cwd(), 'data/runtime/plantae.sqlite');
}

/** Each entry upgrades the schema by one version (`PRAGMA user_version`). Never edit an applied entry: add a new one. */
const MIGRATIONS: string[] = [
  `CREATE TABLE users (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     username TEXT NOT NULL UNIQUE COLLATE NOCASE,
     password_hash TEXT NOT NULL,
     created_at TEXT NOT NULL
   );
   CREATE TABLE sessions (
     token_hash TEXT PRIMARY KEY,
     user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     created_at TEXT NOT NULL,
     expires_at TEXT NOT NULL
   );
   CREATE INDEX sessions_user ON sessions(user_id);
   CREATE TABLE farms (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
     name TEXT NOT NULL,
     place_label TEXT,
     latitude REAL NOT NULL,
     longitude REAL NOT NULL,
     planting_month INTEGER NOT NULL,
     irrigation TEXT NOT NULL,
     polygon_json TEXT,
     soil_observation_json TEXT,
     input_json TEXT NOT NULL,
     created_at TEXT NOT NULL,
     updated_at TEXT NOT NULL
   );
   CREATE TABLE crop_events (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     farm_id INTEGER NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
     position INTEGER NOT NULL,
     crop_id TEXT,
     other_label TEXT,
     start_ym TEXT NOT NULL,
     end_ym TEXT NOT NULL
   );
   CREATE INDEX crop_events_farm ON crop_events(farm_id, position);`,
];

function migrate(db: DatabaseSync): void {
  const row = db.prepare('PRAGMA user_version').get() as { user_version: number };
  for (let version = row.user_version; version < MIGRATIONS.length; version += 1) {
    db.exec('BEGIN');
    try { db.exec(MIGRATIONS[version]); db.exec(`PRAGMA user_version = ${version + 1}`); db.exec('COMMIT'); }
    catch (error) { db.exec('ROLLBACK'); throw error; }
  }
}

export function openDb(path: string): DatabaseSync {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys = ON;');
  if (path !== ':memory:') db.exec('PRAGMA journal_mode = WAL;');
  migrate(db);
  return db;
}

// One connection per server process; the global keeps it across Next's dev hot reloads.
const holder = globalThis as unknown as { __plantaeDb?: DatabaseSync };
export function getDb(): DatabaseSync {
  holder.__plantaeDb ??= openDb(dbPath());
  return holder.__plantaeDb;
}
