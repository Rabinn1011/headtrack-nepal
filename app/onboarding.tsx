import React, { useState } from 'react';
import { Platform, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AppText } from '../src/components/AppText';
import {
  ChoicePill,
  LabeledInput,
  PillGroup,
  PrimaryButton,
  QuestionCard,
  Screen,
  SecondaryButton,
} from '../src/components/ui';
import { PinPad } from '../src/components/PinPad';
import { setLanguage, type AppLanguage } from '../src/i18n';
import { enrolParticipant, logEvent } from '../src/db/repository';
import { setPin } from '../src/security/pin';
import {
  ensureNotificationSetup,
  scheduleDailyReminder,
} from '../src/notifications/reminders';
import { useApp } from '../src/state/AppContext';
import { C, spacing } from '../src/theme/tokens';

type Step = 'language' | 'enrol' | 'pin' | 'reminder' | 'battery' | 'done';
const ORDER: Step[] = ['language', 'enrol', 'pin', 'reminder', 'battery', 'done'];

export default function Onboarding() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { refreshParticipant, unlock } = useApp();

  const [step, setStep] = useState<Step>('language');

  // enrolment fields (completed with study staff)
  const [participantId, setParticipantId] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState<number | null>(null);
  const [historyMonths, setHistoryMonths] = useState('');
  const [smartphoneExp, setSmartphoneExp] = useState<number | null>(null);
  const [enrolError, setEnrolError] = useState(false);

  // PIN
  const [pin1, setPin1] = useState('');
  const [pin2, setPin2] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [pinError, setPinError] = useState(false);

  // reminder
  const [reminderTime, setReminderTime] = useState(new Date(2000, 0, 1, 20, 0));
  const [showPicker, setShowPicker] = useState(Platform.OS === 'ios');

  const next = () => setStep(ORDER[ORDER.indexOf(step) + 1]);

  const sexOptions = t('onboarding.sexOptions', { returnObjects: true }) as string[];
  const expOptions = t('onboarding.smartphoneExpOptions', { returnObjects: true }) as string[];
  const sexKeys = ['female', 'male', 'other'] as const;

  const enrolValid =
    participantId.trim().length > 0 &&
    Number(age) > 0 &&
    sex !== null &&
    historyMonths.trim().length > 0 &&
    smartphoneExp !== null;

  const finishEnrol = async () => {
    if (!enrolValid) {
      setEnrolError(true);
      return;
    }
    await enrolParticipant({
      participantId: participantId.trim(),
      age: Number(age),
      sex: sexKeys[sex!],
      headacheHistoryMonths: Number(historyMonths),
      smartphoneExperience: smartphoneExp!,
    });
    await refreshParticipant();
    await logEvent('enrolled');
    next();
  };

  const submitPin = async () => {
    if (!confirming) {
      if (pin1.length === 4) setConfirming(true);
      return;
    }
    if (pin2.length !== 4) return;
    if (pin1 !== pin2) {
      setPinError(true);
      setPin1('');
      setPin2('');
      setConfirming(false);
      return;
    }
    await setPin(pin1);
    unlock(); // freshly set — no need to ask again this session
    next();
  };

  const submitReminder = async () => {
    const granted = await ensureNotificationSetup();
    if (granted) {
      await scheduleDailyReminder(reminderTime.getHours(), reminderTime.getMinutes());
    }
    next();
  };

  return (
    <Screen>
      {step === 'language' && (
        <View style={{ gap: spacing.md, marginTop: spacing.xxl }}>
          <AppText weight="bold" size="xl">
            {t('onboarding.welcomeTitle')}
          </AppText>
          <AppText color={C.textSub}>{t('onboarding.welcomeBody')}</AppText>
          <QuestionCard title={t('onboarding.chooseLanguage')}>
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
          <PrimaryButton label={t('common.continue')} onPress={next} />
        </View>
      )}

      {step === 'enrol' && (
        <View style={{ gap: spacing.md }}>
          <AppText weight="bold" size="xl">
            {t('onboarding.enrolTitle')}
          </AppText>
          <AppText color={C.textSub}>{t('onboarding.enrolBody')}</AppText>
          <QuestionCard>
            <LabeledInput
              label={t('onboarding.participantId')}
              value={participantId}
              onChangeText={setParticipantId}
              placeholder={t('onboarding.participantIdPlaceholder')}
              error={enrolError && !participantId.trim() ? t('onboarding.errRequired') : null}
            />
            <LabeledInput
              label={t('onboarding.age')}
              value={age}
              onChangeText={setAge}
              keyboardType="number-pad"
              error={enrolError && !(Number(age) > 0) ? t('onboarding.errRequired') : null}
            />
            <AppText size="sm" color={C.textSub} style={{ marginBottom: spacing.xs }}>
              {t('onboarding.sex')}
            </AppText>
            <PillGroup options={sexOptions} value={sex} onChange={setSex} />
            <View style={{ height: spacing.md }} />
            <LabeledInput
              label={t('onboarding.historyMonths')}
              value={historyMonths}
              onChangeText={setHistoryMonths}
              keyboardType="number-pad"
              error={enrolError && !historyMonths.trim() ? t('onboarding.errRequired') : null}
            />
            <AppText size="sm" color={C.textSub} style={{ marginBottom: spacing.xs }}>
              {t('onboarding.smartphoneExp')}
            </AppText>
            <PillGroup options={expOptions} value={smartphoneExp} onChange={setSmartphoneExp} />
          </QuestionCard>
          <PrimaryButton label={t('common.continue')} onPress={() => void finishEnrol()} />
        </View>
      )}

      {step === 'pin' && (
        <View style={{ gap: spacing.lg }}>
          <AppText weight="bold" size="xl">
            {t('onboarding.pinTitle')}
          </AppText>
          <AppText color={C.textSub}>
            {confirming ? t('onboarding.pinConfirm') : t('onboarding.pinBody')}
          </AppText>
          {pinError ? (
            <AppText size="sm" color={C.danger}>
              {t('onboarding.pinMismatch')}
            </AppText>
          ) : null}
          <PinPad
            value={confirming ? pin2 : pin1}
            onChange={(v) => {
              setPinError(false);
              confirming ? setPin2(v) : setPin1(v);
            }}
          />
          <PrimaryButton
            label={t('common.continue')}
            disabled={(confirming ? pin2 : pin1).length !== 4}
            onPress={() => void submitPin()}
          />
        </View>
      )}

      {step === 'reminder' && (
        <View style={{ gap: spacing.md }}>
          <AppText weight="bold" size="xl">
            {t('onboarding.reminderTitle')}
          </AppText>
          <AppText color={C.textSub}>{t('onboarding.reminderBody')}</AppText>
          <QuestionCard>
            <SecondaryButton
              label={`${t('settings.reminderTime')}: ${reminderTime.getHours().toString().padStart(2, '0')}:${reminderTime.getMinutes().toString().padStart(2, '0')}`}
              onPress={() => setShowPicker(true)}
            />
            {showPicker && (
              <DateTimePicker
                value={reminderTime}
                mode="time"
                onChange={(_, date) => {
                  if (Platform.OS === 'android') setShowPicker(false);
                  if (date) setReminderTime(date);
                }}
              />
            )}
          </QuestionCard>
          <PrimaryButton label={t('common.continue')} onPress={() => void submitReminder()} />
        </View>
      )}

      {step === 'battery' && (
        <View style={{ gap: spacing.md }}>
          <AppText weight="bold" size="xl">
            {t('onboarding.batteryTitle')}
          </AppText>
          <QuestionCard title={t('settings.batteryTitle')}>
            <AppText size="sm" color={C.textSub}>
              {t('settings.batteryBody')}
            </AppText>
          </QuestionCard>
          <PrimaryButton label={t('common.continue')} onPress={next} />
        </View>
      )}

      {step === 'done' && (
        <View style={{ gap: spacing.md, marginTop: spacing.xxl }}>
          <AppText weight="bold" size="xl">
            {t('onboarding.finishTitle')}
          </AppText>
          <AppText color={C.textSub}>{t('onboarding.finishBody')}</AppText>
          <PrimaryButton
            label={t('onboarding.start')}
            onPress={() => router.replace('/(tabs)')}
          />
        </View>
      )}
    </Screen>
  );
}
