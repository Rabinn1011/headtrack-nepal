import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Schema mirrors Appendix 1 of the protocol / Section 5 of the technical
 * proposal. All tables key off the locally generated participant_id (the
 * study ID) — never a name. The PIN hash is kept in the OS secure store,
 * NOT in this database.
 */

export const participants = sqliteTable('participants', {
  participantId: text('participant_id').primaryKey(), // study ID, never a name
  age: integer('age').notNull(),
  sex: text('sex', { enum: ['female', 'male', 'other'] }).notNull(),
  headacheHistoryMonths: integer('headache_history_months').notNull(),
  smartphoneExperience: integer('smartphone_experience').notNull(), // 0=new,1=some,2=daily
  enrolledAt: text('enrolled_at').notNull(), // ISO datetime
});

export const dailyEntries = sqliteTable('daily_entries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  participantId: text('participant_id')
    .notNull()
    .references(() => participants.participantId),
  entryDate: text('entry_date').notNull().unique(), // YYYY-MM-DD, one row per calendar day
  hadHeadache: integer('had_headache', { mode: 'boolean' }).notNull(),
  sleepQuality: integer('sleep_quality').notNull(), // 0=Poor 1=Fair 2=Good
  perceivedStress: integer('perceived_stress').notNull(), // 0=Low 1=Medium 2=High
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const headacheDetails = sqliteTable('headache_details', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  entryId: integer('entry_id')
    .notNull()
    .unique()
    .references(() => dailyEntries.id, { onDelete: 'cascade' }),
  severity0_10: integer('severity_0_10').notNull(),
  durationBucket: integer('duration_bucket').notNull(), // 0..3
  activityLimitation: integer('activity_limitation').notNull(), // 0..3
  medicineTaken: integer('medicine_taken', { mode: 'boolean' }).notNull(),
  symptoms: text('symptoms').notNull().default('[]'), // JSON array of symptom keys
  site: text('site'), // optional, one of the site option keys
  notes: text('notes'),
});

export const phq9Responses = sqliteTable('phq9_responses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  participantId: text('participant_id')
    .notNull()
    .references(() => participants.participantId),
  timepoint: text('timepoint', { enum: ['baseline', '8week'] }).notNull(),
  item1: integer('item_1').notNull(),
  item2: integer('item_2').notNull(),
  item3: integer('item_3').notNull(),
  item4: integer('item_4').notNull(),
  item5: integer('item_5').notNull(),
  item6: integer('item_6').notNull(),
  item7: integer('item_7').notNull(),
  item8: integer('item_8').notNull(),
  item9: integer('item_9').notNull(),
  totalScore: integer('total_score').notNull(),
  // item_9_flag drives the immediate clinician-referral safety pathway
  // (protocol Section 8) — kept denormalised so the safety check never
  // depends on recomputing scores.
  item9Flag: integer('item_9_flag', { mode: 'boolean' }).notNull(),
  completedAt: text('completed_at').notNull(),
});

export const appEvents = sqliteTable('app_events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  participantId: text('participant_id').notNull(),
  eventType: text('event_type').notNull(), // app_open, reminder_fired, reminder_opened, entry_saved, export_pdf, export_csv, phq9_completed, encryption_check_failed, ...
  occurredAt: text('occurred_at').notNull(),
});

export type Participant = typeof participants.$inferSelect;
export type DailyEntry = typeof dailyEntries.$inferSelect;
export type HeadacheDetail = typeof headacheDetails.$inferSelect;
export type Phq9Response = typeof phq9Responses.$inferSelect;
export type AppEvent = typeof appEvents.$inferSelect;
