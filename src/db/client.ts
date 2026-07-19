import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';
import { drizzle, type ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';

import { getOrCreateDbKeyHex } from '../security/keys';
import { runMigrations } from './migrations';
import * as schema from './schema';

export const DB_FILE_NAME = 'headtrack.db';

let rawDb: SQLiteDatabase | null = null;
let db: ExpoSQLiteDatabase<typeof schema> | null = null;

/**
 * Opens (and on first launch creates) the encrypted database.
 *
 * SQLCipher is enabled through the expo-sqlite config plugin
 * (`"useSQLCipher": true` in app.json), and the key is applied with
 * `PRAGMA key` as the very first statement after open — before any other
 * statement touches the file. The key lives only in expo-secure-store.
 *
 * In Expo Go SQLCipher is NOT compiled in, so `PRAGMA key` is a no-op and
 * the file stays plaintext; development builds / EAS builds are encrypted.
 * The startup self-check (security/dbCheck.ts) makes this visible.
 */
export async function initDatabase(): Promise<void> {
  if (db) return;
  const keyHex = await getOrCreateDbKeyHex();
  const raw = openDatabaseSync(DB_FILE_NAME);
  // Raw-key form avoids any key-derivation ambiguity across SQLCipher versions.
  raw.execSync(`PRAGMA key = "x'${keyHex}'"`);
  raw.execSync('PRAGMA journal_mode = WAL');
  raw.execSync('PRAGMA foreign_keys = ON');
  runMigrations(raw);
  rawDb = raw;
  db = drizzle(raw, { schema });
}

export function getDb(): ExpoSQLiteDatabase<typeof schema> {
  if (!db) throw new Error('Database not initialised — call initDatabase() first');
  return db;
}

export function getRawDb(): SQLiteDatabase {
  if (!rawDb) throw new Error('Database not initialised — call initDatabase() first');
  return rawDb;
}
