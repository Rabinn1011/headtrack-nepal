import React, { useCallback, useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { CircleCheck } from 'lucide-react-native';

import { AppText } from '../../src/components/AppText';
import {
  MultiPillGroup,
  PillGroup,
  PrimaryButton,
  QuestionCard,
  Screen,
  ScreenTitle,
  SecondaryButton,
  YesNoChoice,
} from '../../src/components/ui';
import { SeveritySlider } from '../../src/components/SeveritySlider';
import {
  getEntryByDate,
  logEvent,
  toDateString,
  upsertTodayEntry,
  type EntryWithDetail,
} from '../../src/db/repository';
import { useApp } from '../../src/state/AppContext';
import { C, radius, spacing } from '../../src/theme/tokens';

const SYMPTOM_KEYS = ['nausea', 'light', 'sound', 'aura'] as const;
const SITE_KEYS = ['one_side', 'both_sides', 'forehead', 'back', 'whole'] as const;

export default function TodayScreen() {
  const { t, i18n } = useTranslation();
  const { participant } = useApp();

  const today = toDateString(new Date());
  const [existing, setExisting] = useState<EntryWithDetail | null>(null);
  const [editing, setEditing] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  // form state
  const [hadHeadache, setHadHeadache] = useState<boolean | null>(null);
  const [severity, setSeverity] = useState(5);
  const [duration, setDuration] = useState<number | null>(null);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [medicine, setMedicine] = useState<boolean | null>(null);
  const [activity, setActivity] = useState<number | null>(null);
  const [site, setSite] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [sleep, setSleep] = useState<number | null>(null);
  const [stress, setStress] = useState<number | null>(null);
  const openedAt = useRef(Date.now());

  const loadToday = useCallback(async () => {
    const entry = await getEntryByDate(today);
    setExisting(entry);
    setJustSaved(false);
    if (entry) {
      // preload for editing
      setHadHeadache(entry.hadHeadache);
      setSleep(entry.sleepQuality);
      setStress(entry.perceivedStress);
      if (entry.detail) {
        setSeverity(entry.detail.severity0_10);
        setDuration(entry.detail.durationBucket);
        setSymptoms(JSON.parse(entry.detail.symptoms ?? '[]'));
        setMedicine(entry.detail.medicineTaken);
        setActivity(entry.detail.activityLimitation);
        setSite(entry.detail.site ? SITE_KEYS.indexOf(entry.detail.site as never) : null);
        setNotes(entry.detail.notes ?? '');
      }
    } else {
      setEditing(false);
      openedAt.current = Date.now();
    }
  }, [today]);

  useFocusEffect(
    useCallback(() => {
      void loadToday();
    }, [loadToday]),
  );

  const durationOptions = t('checkin.durationOptions', { returnObjects: true }) as string[];
  const activityOptions = t('checkin.activityOptions', { returnObjects: true }) as string[];
  const siteOptions = t('checkin.siteOptions', { returnObjects: true }) as string[];
  const sleepOptions = t('checkin.sleepOptions', { returnObjects: true }) as string[];
  const stressOptions = t('checkin.stressOptions', { returnObjects: true }) as string[];
  const symptomOptions = [
    { key: 'nausea', label: t('checkin.symptomNausea') },
    { key: 'light', label: t('checkin.symptomLight') },
    { key: 'sound', label: t('checkin.symptomSound') },
    { key: 'aura', label: t('checkin.symptomAura') },
  ];

  const detailValid =
    hadHeadache === false ||
    (duration !== null && medicine !== null && activity !== null);
  const formValid = hadHeadache !== null && sleep !== null && stress !== null && detailValid;

  const save = async () => {
    if (!participant || !formValid) return;
    await upsertTodayEntry({
      participantId: participant.participantId,
      entryDate: today,
      hadHeadache: hadHeadache!,
      sleepQuality: sleep!,
      perceivedStress: stress!,
      detail: hadHeadache
        ? {
            severity0_10: severity,
            durationBucket: duration!,
            activityLimitation: activity!,
            medicineTaken: medicine!,
            symptoms,
            site: site !== null ? SITE_KEYS[site] : null,
            notes: notes.trim() || null,
          }
        : undefined,
    });
    await logEvent(existing ? 'entry_edited' : 'entry_saved');
    await logEvent(`entry_duration_ms:${Date.now() - openedAt.current}`);
    setEditing(false);
    setJustSaved(true);
    await loadToday();
    setJustSaved(true);
  };

  const showForm = !existing || editing;

  return (
    <Screen>
      <ScreenTitle text={t('checkin.title')} />
      <AppText size="sm" color={C.textSub} style={{ marginTop: -spacing.md }}>
        {t('checkin.dateToday', { date: today })}
      </AppText>

      {!showForm && existing && (
        <>
          {justSaved ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
                backgroundColor: C.goodSoft,
                borderRadius: radius.md,
                padding: spacing.md,
              }}
            >
              <CircleCheck color={C.good} size={20} />
              <AppText size="sm" color={C.good}>
                {t('checkin.saved')}
              </AppText>
            </View>
          ) : null}
          <QuestionCard title={t('checkin.alreadyLogged')}>
            <AppText weight="medium" size="lg" color={existing.hadHeadache ? C.chartHeadache : C.good}>
              {existing.hadHeadache
                ? t('checkin.summaryHeadache', { severity: existing.detail?.severity0_10 ?? '—' })
                : t('checkin.summaryNoHeadache')}
            </AppText>
            <AppText size="sm" color={C.textSub}>
              {t('checkin.sleepLabel', { value: sleepOptions[existing.sleepQuality] })} ·{' '}
              {t('checkin.stressLabel', { value: stressOptions[existing.perceivedStress] })}
            </AppText>
            {existing.detail?.medicineTaken ? (
              <AppText size="sm" color={C.textSub}>
                {t('diary.medicineTag')}
              </AppText>
            ) : null}
            <AppText size="xs" color={C.textFaint} style={{ marginTop: spacing.xs }}>
              {t('checkin.alreadyLoggedHint')}
            </AppText>
            <View style={{ marginTop: spacing.md }}>
              <SecondaryButton label={t('checkin.editToday')} onPress={() => setEditing(true)} />
            </View>
          </QuestionCard>
        </>
      )}

      {showForm && (
        <>
          <QuestionCard title={t('checkin.question')}>
            <YesNoChoice
              value={hadHeadache}
              onChange={setHadHeadache}
              yesLabel={t('common.yes')}
              noLabel={t('common.no')}
            />
          </QuestionCard>

          {hadHeadache === true && (
            <>
              <QuestionCard title={t('checkin.severity')}>
                <SeveritySlider value={severity} onChange={setSeverity} />
              </QuestionCard>
              <QuestionCard title={t('checkin.duration')}>
                <PillGroup options={durationOptions} value={duration} onChange={setDuration} />
              </QuestionCard>
              <QuestionCard title={t('checkin.symptoms')}>
                <MultiPillGroup
                  options={symptomOptions}
                  values={symptoms}
                  onToggle={(key) =>
                    setSymptoms((prev) =>
                      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
                    )
                  }
                />
              </QuestionCard>
              <QuestionCard title={t('checkin.medicine')}>
                <YesNoChoice
                  value={medicine}
                  onChange={setMedicine}
                  yesLabel={t('common.yes')}
                  noLabel={t('common.no')}
                />
              </QuestionCard>
              <QuestionCard title={t('checkin.activity')}>
                <PillGroup options={activityOptions} value={activity} onChange={setActivity} />
              </QuestionCard>
              <QuestionCard title={`${t('checkin.site')} (${t('common.optional')})`}>
                <PillGroup options={siteOptions} value={site} onChange={setSite} />
              </QuestionCard>
              <QuestionCard title={`${t('checkin.notes')} (${t('common.optional')})`}>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder={t('checkin.notesPlaceholder')}
                  placeholderTextColor={C.textFaint}
                  multiline
                  style={{
                    borderWidth: 1,
                    borderColor: C.border,
                    borderRadius: radius.sm,
                    minHeight: 64,
                    padding: spacing.md,
                    color: C.text,
                    textAlignVertical: 'top',
                    fontFamily:
                      i18n.language === 'ne' ? 'NotoSansDevanagari-Regular' : 'NotoSans-Regular',
                  }}
                />
              </QuestionCard>
            </>
          )}

          {/* Context questions — always asked, regardless of headache answer */}
          <QuestionCard title={t('checkin.sleep')}>
            <PillGroup options={sleepOptions} value={sleep} onChange={setSleep} />
          </QuestionCard>
          <QuestionCard title={t('checkin.stress')}>
            <PillGroup options={stressOptions} value={stress} onChange={setStress} />
          </QuestionCard>

          <PrimaryButton
            label={t('checkin.saveEntry')}
            disabled={!formValid}
            onPress={() => void save()}
          />
        </>
      )}
    </Screen>
  );
}
