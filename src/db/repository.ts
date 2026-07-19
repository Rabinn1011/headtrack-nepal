import { and, desc, eq, gte, lte } from 'drizzle-orm';

import { getDb } from './client';
import {
  appEvents,
  dailyEntries,
  headacheDetails,
  participants,
  phq9Responses,
  type DailyEntry,
  type HeadacheDetail,
  type Participant,
  type Phq9Response,
} from './schema';

/**
 * The only data-access surface of the app. Screens and services must import
 * from this module — never from schema.ts and never with raw SQL (proposal
 * Section 4, data layer).
 */

export type EntryWithDetail = DailyEntry & { detail: HeadacheDetail | null };

export type NewEntryInput = {
  participantId: string;
  entryDate: string; // YYYY-MM-DD
  hadHeadache: boolean;
  sleepQuality: number;
  perceivedStress: number;
  detail?: {
    severity0_10: number;
    durationBucket: number;
    activityLimitation: number;
    medicineTaken: boolean;
    symptoms: string[];
    site?: string | null;
    notes?: string | null;
  };
};

export function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  return toDateString(dt);
}

// ---------- participants ----------

export async function enrolParticipant(p: Omit<Participant, 'enrolledAt'>): Promise<void> {
  await getDb()
    .insert(participants)
    .values({ ...p, enrolledAt: new Date().toISOString() });
}

export async function getParticipant(): Promise<Participant | null> {
  const rows = await getDb().select().from(participants).limit(1);
  return rows[0] ?? null;
}

// ---------- daily entries ----------

export async function getEntryByDate(entryDate: string): Promise<EntryWithDetail | null> {
  const rows = await getDb()
    .select()
    .from(dailyEntries)
    .leftJoin(headacheDetails, eq(headacheDetails.entryId, dailyEntries.id))
    .where(eq(dailyEntries.entryDate, entryDate));
  const row = rows[0];
  if (!row) return null;
  return { ...row.daily_entries, detail: row.headache_details ?? null };
}

/**
 * Creates or replaces the single entry for the given calendar day.
 * When hadHeadache is false any previously saved detail row is removed,
 * keeping the schema-level invariant "details exist only for headache days".
 */
export async function upsertTodayEntry(input: NewEntryInput): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();
  const existing = await getEntryByDate(input.entryDate);

  let entryId: number;
  if (existing) {
    await db
      .update(dailyEntries)
      .set({
        hadHeadache: input.hadHeadache,
        sleepQuality: input.sleepQuality,
        perceivedStress: input.perceivedStress,
        updatedAt: now,
      })
      .where(eq(dailyEntries.id, existing.id));
    entryId = existing.id;
    await db.delete(headacheDetails).where(eq(headacheDetails.entryId, entryId));
  } else {
    const inserted = await db
      .insert(dailyEntries)
      .values({
        participantId: input.participantId,
        entryDate: input.entryDate,
        hadHeadache: input.hadHeadache,
        sleepQuality: input.sleepQuality,
        perceivedStress: input.perceivedStress,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: dailyEntries.id });
    entryId = inserted[0].id;
  }

  if (input.hadHeadache && input.detail) {
    await db.insert(headacheDetails).values({
      entryId,
      severity0_10: input.detail.severity0_10,
      durationBucket: input.detail.durationBucket,
      activityLimitation: input.detail.activityLimitation,
      medicineTaken: input.detail.medicineTaken,
      symptoms: JSON.stringify(input.detail.symptoms),
      site: input.detail.site ?? null,
      notes: input.detail.notes ?? null,
    });
  }
}

export async function getEntriesForRange(
  startDate: string,
  endDate: string,
): Promise<EntryWithDetail[]> {
  const rows = await getDb()
    .select()
    .from(dailyEntries)
    .leftJoin(headacheDetails, eq(headacheDetails.entryId, dailyEntries.id))
    .where(and(gte(dailyEntries.entryDate, startDate), lte(dailyEntries.entryDate, endDate)))
    .orderBy(dailyEntries.entryDate);
  return rows.map((r) => ({ ...r.daily_entries, detail: r.headache_details ?? null }));
}

/** Trailing window ending today (inclusive), e.g. days=14 → today-13 … today. */
export async function getTrailingDays(days: number, today: string): Promise<EntryWithDetail[]> {
  return getEntriesForRange(addDays(today, -(days - 1)), today);
}

export async function getLast14Days(today: string): Promise<EntryWithDetail[]> {
  return getTrailingDays(14, today);
}

export async function getAllEntriesDesc(): Promise<EntryWithDetail[]> {
  const rows = await getDb()
    .select()
    .from(dailyEntries)
    .leftJoin(headacheDetails, eq(headacheDetails.entryId, dailyEntries.id))
    .orderBy(desc(dailyEntries.entryDate));
  return rows.map((r) => ({ ...r.daily_entries, detail: r.headache_details ?? null }));
}

// ---------- PHQ-9 ----------

export async function savePhq9(
  r: Omit<Phq9Response, 'id' | 'completedAt'>,
): Promise<void> {
  await getDb()
    .insert(phq9Responses)
    .values({ ...r, completedAt: new Date().toISOString() });
}

export async function getPhq9ByTimepoint(
  timepoint: 'baseline' | '8week',
): Promise<Phq9Response | null> {
  const rows = await getDb()
    .select()
    .from(phq9Responses)
    .where(eq(phq9Responses.timepoint, timepoint))
    .orderBy(desc(phq9Responses.completedAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function getAllPhq9(): Promise<Phq9Response[]> {
  return getDb().select().from(phq9Responses);
}

// ---------- app events ----------

export async function logEvent(eventType: string): Promise<void> {
  const participant = await getParticipant();
  await getDb().insert(appEvents).values({
    participantId: participant?.participantId ?? 'unenrolled',
    eventType,
    occurredAt: new Date().toISOString(),
  });
}

export async function getAllEvents() {
  return getDb().select().from(appEvents).orderBy(appEvents.occurredAt);
}
