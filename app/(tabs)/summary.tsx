import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AppText } from '../../src/components/AppText';
import { Screen, ScreenTitle } from '../../src/components/ui';
import { NoteCard, SafetyCard, StatCard } from '../../src/components/cards';
import { SeverityChart } from '../../src/components/SeverityChart';
import {
  getAllPhq9,
  getTrailingDays,
  toDateString,
  type EntryWithDetail,
} from '../../src/db/repository';
import { contextFromEntries, evaluateRules } from '../../src/rules/engine';
import { phq9SafetyTriggered } from '../../src/rules/phq9Safety';
import type { RuleResult } from '../../src/rules/types';
import { C, spacing } from '../../src/theme/tokens';

export default function SummaryScreen() {
  const { t } = useTranslation();
  const today = toDateString(new Date());

  const [entries28, setEntries28] = useState<EntryWithDetail[]>([]);
  const [notes, setNotes] = useState<RuleResult[]>([]);
  const [safety, setSafety] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const [entries, phq9] = await Promise.all([getTrailingDays(28, today), getAllPhq9()]);
        if (cancelled) return;
        setEntries28(entries);
        setNotes(evaluateRules(contextFromEntries(today, entries)));
        // Hard-coded PHQ-9 item-9 safety pathway — independent of, and shown
        // above, the general rule engine.
        setSafety(
          phq9SafetyTriggered(phq9.map((r) => ({ timepoint: r.timepoint, item9: r.item9 }))),
        );
      })();
      return () => {
        cancelled = true;
      };
    }, [today]),
  );

  const last7 = entries28.filter((e) => e.entryDate > toDateString(addDaysDate(today, -7)));
  const headacheDays = last7.filter((e) => e.hadHeadache).length;
  const medicineDays = last7.filter((e) => e.detail?.medicineTaken).length;
  const severities = last7
    .map((e) => e.detail?.severity0_10)
    .filter((s): s is number => typeof s === 'number');
  const avgSeverity = severities.length
    ? (severities.reduce((a, b) => a + b, 0) / severities.length).toFixed(1)
    : '—';

  return (
    <Screen>
      <ScreenTitle text={t('summary.title')} />

      {safety && (
        <SafetyCard
          title={t('phq9.safetyTitle')}
          body={t('phq9.safetyBody')}
          contact={t('phq9.safetyContact')}
        />
      )}

      {entries28.length === 0 ? (
        <AppText color={C.textSub}>{t('summary.noData')}</AppText>
      ) : (
        <>
          <AppText size="sm" weight="medium" color={C.textSub}>
            {t('summary.last7')}
          </AppText>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <StatCard label={t('summary.headacheDays')} value={String(headacheDays)} />
            <StatCard label={t('summary.medicineDays')} value={String(medicineDays)} />
            <StatCard label={t('summary.avgSeverity')} value={avgSeverity} />
          </View>

          <SeverityChart entries={entries28} today={today} />

          <AppText size="sm" weight="medium" color={C.textSub} style={{ marginTop: spacing.sm }}>
            {t('summary.notesTitle')}
          </AppText>
          {notes.length === 0 ? (
            <AppText size="sm" color={C.textFaint}>
              {t('summary.notesEmpty')}
            </AppText>
          ) : (
            notes.map((n) => (
              <NoteCard
                key={n.id}
                level={n.level}
                title={t(n.titleKey)}
                body={t(n.messageKey, n.params) as string}
              />
            ))
          )}
        </>
      )}
    </Screen>
  );
}

function addDaysDate(dateStr: string, delta: number): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  return dt;
}
