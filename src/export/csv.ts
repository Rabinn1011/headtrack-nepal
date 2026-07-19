import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import type { AppEvent, Phq9Response } from '../db/schema';
import type { EntryWithDetail } from '../db/repository';
import { getAllEntriesDesc, getAllEvents, getAllPhq9, getParticipant, logEvent } from '../db/repository';
import { encryptForExport } from './encrypt';

/**
 * Hand-written CSV writer for the de-identified research export.
 *
 * De-identification rules (protocol Section 8):
 *  - participant_id (study ID) is the ONLY identifier;
 *  - the free-text `notes` field is EXCLUDED — participants may type
 *    identifying information there, so it never leaves the device;
 *  - the export file is passphrase-encrypted before it becomes shareable.
 */

export function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(header: string[], rows: unknown[][]): string {
  const lines = [header.map(csvEscape).join(',')];
  for (const row of rows) lines.push(row.map(csvEscape).join(','));
  return lines.join('\r\n') + '\r\n';
}

export function buildEntriesCsv(entries: EntryWithDetail[]): string {
  const header = [
    'participant_id',
    'entry_date',
    'had_headache',
    'sleep_quality',
    'perceived_stress',
    'severity_0_10',
    'duration_bucket',
    'activity_limitation',
    'medicine_taken',
    'symptoms',
    'site',
    // `notes` intentionally excluded — free text is not de-identifiable.
  ];
  const rows = entries.map((e) => [
    e.participantId,
    e.entryDate,
    e.hadHeadache ? 1 : 0,
    e.sleepQuality,
    e.perceivedStress,
    e.detail?.severity0_10 ?? '',
    e.detail?.durationBucket ?? '',
    e.detail?.activityLimitation ?? '',
    e.detail ? (e.detail.medicineTaken ? 1 : 0) : '',
    e.detail?.symptoms ?? '',
    e.detail?.site ?? '',
  ]);
  return toCsv(header, rows);
}

export function buildPhq9Csv(responses: Phq9Response[]): string {
  const header = [
    'participant_id',
    'timepoint',
    'item_1', 'item_2', 'item_3', 'item_4', 'item_5', 'item_6', 'item_7', 'item_8', 'item_9',
    'total_score',
    'item_9_flag',
    'completed_at',
  ];
  const rows = responses.map((r) => [
    r.participantId,
    r.timepoint,
    r.item1, r.item2, r.item3, r.item4, r.item5, r.item6, r.item7, r.item8, r.item9,
    r.totalScore,
    r.item9Flag ? 1 : 0,
    r.completedAt,
  ]);
  return toCsv(header, rows);
}

export function buildEventsCsv(events: AppEvent[]): string {
  const header = ['participant_id', 'event_type', 'occurred_at'];
  const rows = events.map((e) => [e.participantId, e.eventType, e.occurredAt]);
  return toCsv(header, rows);
}

/**
 * Creates the passphrase-protected research bundle and opens the system
 * share sheet. The bundle is a single encrypted file whose plaintext is a
 * JSON object of three CSVs ({"entries.csv", "phq9.csv", "app_events.csv"}),
 * unpacked by tools/decrypt-export.js.
 */
export async function exportResearchBundle(passphrase: string): Promise<string> {
  const [participant, entries, phq9, events] = await Promise.all([
    getParticipant(),
    getAllEntriesDesc(),
    getAllPhq9(),
    getAllEvents(),
  ]);
  const bundle = JSON.stringify({
    'entries.csv': buildEntriesCsv(entries),
    'phq9.csv': buildPhq9Csv(phq9),
    'app_events.csv': buildEventsCsv(events),
  });
  const encrypted = await encryptForExport(bundle, passphrase);
  const date = new Date().toISOString().slice(0, 10);
  const fileName = `headtrack_export_${participant?.participantId ?? 'unenrolled'}_${date}.htn.enc`;
  const path = `${FileSystem.cacheDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(path, encrypted);
  await logEvent('export_csv');
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(path, { mimeType: 'application/octet-stream' });
  }
  return path;
}
