import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import i18n from '../i18n';
import type { Participant } from '../db/schema';
import type { EntryWithDetail } from '../db/repository';
import { getParticipant, getTrailingDays, logEvent, toDateString } from '../db/repository';
import { contextFromEntries, evaluateRules } from '../rules/engine';
import { C } from '../theme/tokens';

/**
 * On-device clinician PDF summary (proposal Section 7.5 "Clinician report").
 * Generated entirely locally with expo-print — no server round-trip. The
 * report shows the study ID, never a name.
 */

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function buildClinicSummaryHtml(
  participant: Participant,
  entries: EntryWithDetail[],
  today: string,
): string {
  const t = (key: string, opts?: Record<string, unknown>) => String(i18n.t(key, opts));

  const headacheDays = entries.filter((e) => e.hadHeadache);
  const medicineDays = entries.filter((e) => e.detail?.medicineTaken);
  const severities = headacheDays
    .map((e) => e.detail?.severity0_10)
    .filter((s): s is number => typeof s === 'number');
  const avgSeverity = severities.length
    ? (severities.reduce((a, b) => a + b, 0) / severities.length).toFixed(1)
    : '—';

  const notes = evaluateRules(contextFromEntries(today, entries));

  const durationLabels = i18n.t('checkin.durationOptions', { returnObjects: true }) as string[];
  const sleepLabels = i18n.t('checkin.sleepOptions', { returnObjects: true }) as string[];
  const stressLabels = i18n.t('checkin.stressOptions', { returnObjects: true }) as string[];

  const rows = [...entries]
    .sort((a, b) => (a.entryDate < b.entryDate ? 1 : -1))
    .map((e) => {
      const d = e.detail;
      return `<tr>
        <td>${esc(e.entryDate)}</td>
        <td>${e.hadHeadache ? esc(t('common.yes')) : esc(t('common.no'))}</td>
        <td>${d ? d.severity0_10 : ''}</td>
        <td>${d ? esc(durationLabels[d.durationBucket] ?? '') : ''}</td>
        <td>${d ? (d.medicineTaken ? esc(t('common.yes')) : esc(t('common.no'))) : ''}</td>
        <td>${esc(sleepLabels[e.sleepQuality] ?? '')}</td>
        <td>${esc(stressLabels[e.perceivedStress] ?? '')}</td>
      </tr>`;
    })
    .join('');

  const noteHtml = notes
    .map(
      (n) => `<div class="note note-${n.level}">
        <strong>${esc(t(n.titleKey))}</strong><br/>${esc(t(n.messageKey, n.params))}
      </div>`,
    )
    .join('');

  return `
  <html><head><meta charset="utf-8"/>
  <style>
    body { font-family: 'Noto Sans', 'Noto Sans Devanagari', sans-serif; color: ${C.text}; margin: 24px; font-size: 12px; }
    h1 { font-size: 18px; margin: 0; color: ${C.primaryDark}; }
    .meta { color: ${C.textSub}; margin: 4px 0 16px; }
    .stats { display: flex; gap: 12px; margin-bottom: 16px; }
    .stat { border: 1px solid ${C.border}; border-radius: 8px; padding: 10px 14px; }
    .stat b { font-size: 20px; display: block; }
    table { border-collapse: collapse; width: 100%; margin-top: 8px; }
    th, td { border: 1px solid ${C.border}; padding: 4px 6px; text-align: left; }
    th { background: ${C.surfaceAlt}; }
    .note { border-radius: 8px; padding: 8px 12px; margin: 6px 0; border: 1px solid ${C.border}; }
    .note-warning { background: ${C.warningSoft}; }
    .note-info { background: ${C.infoSoft}; }
    .note-good { background: ${C.goodSoft}; }
    .disclaimer { margin-top: 16px; color: ${C.textSub}; font-size: 10px; }
  </style></head><body>
    <h1>${esc(t('pdf.title'))}</h1>
    <div class="meta">
      ${esc(t('settings.studyId', { id: participant.participantId }))} ·
      ${esc(t('pdf.generated', { date: today }))} · ${esc(t('pdf.period'))}
    </div>
    <div class="stats">
      <div class="stat"><b>${headacheDays.length}</b>${esc(t('summary.headacheDays'))}</div>
      <div class="stat"><b>${medicineDays.length}</b>${esc(t('summary.medicineDays'))}</div>
      <div class="stat"><b>${avgSeverity}</b>${esc(t('summary.avgSeverity'))}</div>
    </div>
    <h2 style="font-size:14px">${esc(t('summary.notesTitle'))}</h2>
    ${noteHtml || '—'}
    <h2 style="font-size:14px">${esc(t('pdf.dayTable'))}</h2>
    <table>
      <tr>
        <th>${esc(t('pdf.colDate'))}</th><th>${esc(t('pdf.colHeadache'))}</th>
        <th>${esc(t('pdf.colSeverity'))}</th><th>${esc(t('pdf.colDuration'))}</th>
        <th>${esc(t('pdf.colMedicine'))}</th><th>${esc(t('pdf.colSleep'))}</th>
        <th>${esc(t('pdf.colStress'))}</th>
      </tr>
      ${rows}
    </table>
    <div class="disclaimer">${esc(t('settings.disclaimerBody'))}</div>
  </body></html>`;
}

export async function generateAndShareClinicPdf(): Promise<string | null> {
  const participant = await getParticipant();
  if (!participant) return null;
  const today = toDateString(new Date());
  const entries = await getTrailingDays(28, today);
  const html = buildClinicSummaryHtml(participant, entries, today);
  const { uri } = await Print.printToFileAsync({ html });
  await logEvent('export_pdf');
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
  }
  return uri;
}
