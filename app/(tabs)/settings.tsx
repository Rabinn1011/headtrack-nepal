import React, { useCallback, useState } from 'react';
import { Modal, Platform, Switch, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Constants from 'expo-constants';

import { AppText } from '../../src/components/AppText';
import {
  ChoicePill,
  LabeledInput,
  PrimaryButton,
  QuestionCard,
  Screen,
  ScreenTitle,
  SecondaryButton,
} from '../../src/components/ui';
import { setLanguage, type AppLanguage } from '../../src/i18n';
import {
  cancelDailyReminder,
  ensureNotificationSetup,
  getReminderTime,
  scheduleDailyReminder,
} from '../../src/notifications/reminders';
import { generateAndShareClinicPdf } from '../../src/export/pdf';
import { exportResearchBundle } from '../../src/export/csv';
import { getPhq9ByTimepoint } from '../../src/db/repository';
import { useApp } from '../../src/state/AppContext';
import { C, spacing } from '../../src/theme/tokens';

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { participant } = useApp();

  const [reminderOn, setReminderOn] = useState(false);
  const [time, setTime] = useState(new Date(2000, 0, 1, 20, 0));
  const [showPicker, setShowPicker] = useState(false);
  const [phqDone, setPhqDone] = useState<{ baseline: string | null; endline: string | null }>({
    baseline: null,
    endline: null,
  });
  const [exportModal, setExportModal] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [passError, setPassError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const [stored, baseline, endline] = await Promise.all([
          getReminderTime(),
          getPhq9ByTimepoint('baseline'),
          getPhq9ByTimepoint('8week'),
        ]);
        if (cancelled) return;
        setReminderOn(Boolean(stored));
        if (stored) setTime(new Date(2000, 0, 1, stored.hour, stored.minute));
        setPhqDone({
          baseline: baseline?.completedAt.slice(0, 10) ?? null,
          endline: endline?.completedAt.slice(0, 10) ?? null,
        });
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const toggleReminder = async (on: boolean) => {
    setReminderOn(on);
    if (on) {
      const granted = await ensureNotificationSetup();
      if (!granted) {
        setReminderOn(false);
        return;
      }
      await scheduleDailyReminder(time.getHours(), time.getMinutes());
    } else {
      await cancelDailyReminder();
    }
  };

  const changeTime = async (date: Date) => {
    setTime(date);
    if (reminderOn) await scheduleDailyReminder(date.getHours(), date.getMinutes());
  };

  const runCsvExport = async () => {
    if (passphrase.length < 8) {
      setPassError(t('export.passTooShort'));
      return;
    }
    setExportModal(false);
    await exportResearchBundle(passphrase);
    setPassphrase('');
    setStatusMsg(t('export.csvReady'));
  };

  const timeLabel = `${time.getHours().toString().padStart(2, '0')}:${time
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;

  return (
    <Screen>
      <ScreenTitle text={t('settings.title')} />

      {/* Language — persists immediately, no restart */}
      <QuestionCard title={t('settings.language')}>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {(['ne', 'en'] as AppLanguage[]).map((lang) => (
            <ChoicePill
              key={lang}
              label={lang === 'ne' ? t('settings.languageNepali') : t('settings.languageEnglish')}
              selected={i18n.language === lang}
              onPress={() => void setLanguage(lang)}
            />
          ))}
        </View>
      </QuestionCard>

      {/* Daily reminder */}
      <QuestionCard title={t('settings.reminderTitle')}>
        <AppText size="sm" color={C.textSub}>
          {t('settings.reminderBody')}
        </AppText>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: spacing.sm,
          }}
        >
          <AppText size="sm">{reminderOn ? t('settings.reminderOn') : t('settings.reminderOff')}</AppText>
          <Switch
            value={reminderOn}
            onValueChange={(v) => void toggleReminder(v)}
            trackColor={{ true: C.primary, false: C.border }}
            thumbColor={C.surface}
          />
        </View>
        {reminderOn ? (
          <View style={{ marginTop: spacing.sm }}>
            <SecondaryButton
              label={`${t('settings.reminderTime')}: ${timeLabel}`}
              onPress={() => setShowPicker(true)}
            />
          </View>
        ) : null}
        {showPicker && (
          <DateTimePicker
            value={time}
            mode="time"
            onChange={(_, date) => {
              if (Platform.OS === 'android') setShowPicker(false);
              if (date) void changeTime(date);
            }}
          />
        )}
        <View style={{ marginTop: spacing.sm }}>
          <AppText size="xs" weight="medium" color={C.textSub}>
            {t('settings.batteryTitle')}
          </AppText>
          <AppText size="xs" color={C.textFaint}>
            {t('settings.batteryBody')}
          </AppText>
        </View>
      </QuestionCard>

      {/* PHQ-9 wellbeing checks */}
      <QuestionCard title={t('settings.wellbeingTitle')}>
        <AppText size="sm" color={C.textSub} style={{ marginBottom: spacing.sm }}>
          {t('settings.wellbeingBody')}
        </AppText>
        <View style={{ gap: spacing.sm }}>
          <SecondaryButton
            label={
              phqDone.baseline
                ? `${t('settings.phqBaseline')} — ${t('settings.phqDone', { date: phqDone.baseline })}`
                : t('settings.phqBaseline')
            }
            onPress={() => router.push({ pathname: '/phq9', params: { timepoint: 'baseline' } })}
          />
          <SecondaryButton
            label={
              phqDone.endline
                ? `${t('settings.phqEndline')} — ${t('settings.phqDone', { date: phqDone.endline })}`
                : t('settings.phqEndline')
            }
            onPress={() => router.push({ pathname: '/phq9', params: { timepoint: '8week' } })}
          />
        </View>
      </QuestionCard>

      {/* Exports */}
      <QuestionCard title={t('settings.exportTitle')}>
        <AppText size="sm" color={C.textSub}>
          {t('settings.clinicSummaryBody')}
        </AppText>
        <View style={{ marginTop: spacing.sm, gap: spacing.sm }}>
          <PrimaryButton
            label={t('settings.clinicSummary')}
            onPress={() =>
              void generateAndShareClinicPdf().then((uri) =>
                setStatusMsg(uri ? t('export.pdfReady') : t('export.nothing')),
              )
            }
          />
          <AppText size="sm" color={C.textSub}>
            {t('settings.researchExportBody')}
          </AppText>
          <SecondaryButton label={t('settings.researchExport')} onPress={() => setExportModal(true)} />
          {statusMsg ? (
            <AppText size="sm" color={C.good}>
              {statusMsg}
            </AppText>
          ) : null}
        </View>
      </QuestionCard>

      {/* Privacy + disclaimer */}
      <QuestionCard title={t('settings.privacyTitle')}>
        <AppText size="sm" color={C.textSub}>
          {t('settings.privacyBody')}
        </AppText>
      </QuestionCard>
      <QuestionCard title={t('settings.disclaimerTitle')}>
        <AppText size="sm" color={C.textSub}>
          {t('settings.disclaimerBody')}
        </AppText>
      </QuestionCard>

      <AppText size="xs" color={C.textFaint} style={{ textAlign: 'center' }}>
        {participant ? t('settings.studyId', { id: participant.participantId }) : ''}
        {'  ·  '}
        {t('settings.appVersion', { version: Constants.expoConfig?.version ?? '1.0.0' })}
      </AppText>

      {/* CSV passphrase modal */}
      <Modal visible={exportModal} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(23,34,46,0.5)',
            justifyContent: 'center',
            padding: spacing.xl,
          }}
        >
          <View style={{ backgroundColor: C.surface, borderRadius: 16, padding: spacing.lg, gap: spacing.sm }}>
            <AppText weight="bold" size="lg">
              {t('export.passTitle')}
            </AppText>
            <AppText size="sm" color={C.textSub}>
              {t('export.passBody')}
            </AppText>
            <LabeledInput
              label={t('export.passPlaceholder')}
              value={passphrase}
              onChangeText={(v) => {
                setPassphrase(v);
                setPassError(null);
              }}
              secureTextEntry
              error={passError}
            />
            <PrimaryButton label={t('export.create')} onPress={() => void runCsvExport()} />
            <SecondaryButton
              label={t('common.cancel')}
              onPress={() => {
                setExportModal(false);
                setPassphrase('');
                setPassError(null);
              }}
            />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
