import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * Hand-rolled, forward-only migration runner tracked via PRAGMA user_version.
 * Each entry runs inside a transaction exactly once per install. Keep the SQL
 * in lock-step with src/db/schema.ts — the Drizzle schema is the typed view
 * over these tables.
 */
const MIGRATIONS: string[] = [
  // v1 — initial schema (protocol Appendix 1 / proposal Section 5)
  `
  CREATE TABLE IF NOT EXISTS participants (
    participant_id TEXT PRIMARY KEY NOT NULL,
    age INTEGER NOT NULL,
    sex TEXT NOT NULL,
    headache_history_months INTEGER NOT NULL,
    smartphone_experience INTEGER NOT NULL,
    enrolled_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS daily_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    participant_id TEXT NOT NULL REFERENCES participants(participant_id),
    entry_date TEXT NOT NULL UNIQUE,
    had_headache INTEGER NOT NULL,
    sleep_quality INTEGER NOT NULL,
    perceived_stress INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS headache_details (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_id INTEGER NOT NULL UNIQUE REFERENCES daily_entries(id) ON DELETE CASCADE,
    severity_0_10 INTEGER NOT NULL,
    duration_bucket INTEGER NOT NULL,
    activity_limitation INTEGER NOT NULL,
    medicine_taken INTEGER NOT NULL,
    symptoms TEXT NOT NULL DEFAULT '[]',
    site TEXT,
    notes TEXT
  );
  CREATE TABLE IF NOT EXISTS phq9_responses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    participant_id TEXT NOT NULL REFERENCES participants(participant_id),
    timepoint TEXT NOT NULL,
    item_1 INTEGER NOT NULL, item_2 INTEGER NOT NULL, item_3 INTEGER NOT NULL,
    item_4 INTEGER NOT NULL, item_5 INTEGER NOT NULL, item_6 INTEGER NOT NULL,
    item_7 INTEGER NOT NULL, item_8 INTEGER NOT NULL, item_9 INTEGER NOT NULL,
    total_score INTEGER NOT NULL,
    item_9_flag INTEGER NOT NULL,
    completed_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS app_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    participant_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    occurred_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_daily_entries_date ON daily_entries(entry_date);
  CREATE INDEX IF NOT EXISTS idx_app_events_type ON app_events(event_type);
  `,
];

export function runMigrations(db: SQLiteDatabase): void {
  const row = db.getFirstSync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  for (let v = current; v < MIGRATIONS.length; v++) {
    db.withTransactionSync(() => {
      db.execSync(MIGRATIONS[v]);
      db.execSync(`PRAGMA user_version = ${v + 1}`);
    });
  }
}
