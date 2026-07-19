import React, { useState } from 'react';
import { Modal, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AppText } from '../src/components/AppText';
import { PillGroup, PrimaryButton, QuestionCard, Screen, ScreenTitle } from '../src/components/ui';
import { SafetyCard } from '../src/components/cards';
import { computePhq9Total, isItem9Positive } from '../src/rules/phq9Safety';
import { logEvent, savePhq9 } from '../src/db/repository';
import { useApp } from '../src/state/AppContext';
import { C, spacing } from '../src/theme/tokens';

/**
 * PHQ-9 wellbeing check, administered at baseline and 8 weeks with the study
 * team. Item 9 positive (>0) triggers the hard-coded clinician-contact
 * safety prompt immediately on save — before anything else — per protocol
 * Section 8.
 */
export default function Phq9Screen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { participant } = useApp();
  const params = useLocalSearchParams<{ timepoint?: string }>();
  const timepoint = params.timepoint === '8week' ? '8week' : 'baseline';

  const items = t('phq9.items', { returnObjects: true }) as string[];
  const options = t('phq9.options', { returnObjects: true }) as string[];
  const translationNote = t('phq9.translationNote', { defaultValue: '' });

  const [answers, setAnswers] = useState<(number | null)[]>(Array(9).fill(null));
  const [safetyVisible, setSafetyVisible] = useState(false);

  const complete = answers.every((a) => a !== null);

  const save = async () => {
    if (!participant || !complete) return;
    const values = answers as number[];
    const total = computePhq9Total(values);
    const item9Flag = isItem9Positive(values[8]);
    await savePhq9({
      participantId: participant.participantId,
      timepoint,
      item1: values[0],
      item2: values[1],
      item3: values[2],
      item4: values[3],
      item5: values[4],
      item6: values[5],
      item7: values[6],
      item8: values[7],
      item9: values[8],
      totalScore: total,
      item9Flag,
    });
    await logEvent(`phq9_completed_${timepoint}`);
    if (item9Flag) {
      await logEvent('phq9_item9_flag');
      setSafetyVisible(true); // shown before leaving the screen
    } else {
      router.back();
    }
  };

  return (
    <Screen>
      <ScreenTitle
        text={`${t('phq9.title')} — ${
          timepoint === 'baseline' ? t('settings.phqBaseline') : t('settings.phqEndline')
        }`}
      />
      <AppText size="sm" color={C.textSub}>
        {t('phq9.intro')}
      </AppText>
      {translationNote ? (
        <AppText size="xs" color={C.warning}>
          {translationNote}
        </AppText>
      ) : null}

      {items.map((item, idx) => (
        <QuestionCard key={idx} title={`${idx + 1}. ${item}`}>
          <PillGroup
            options={options}
            value={answers[idx]}
            onChange={(v) =>
              setAnswers((prev) => prev.map((a, i) => (i === idx ? v : a)))
            }
          />
        </QuestionCard>
      ))}

      {complete ? (
        <AppText weight="medium" style={{ textAlign: 'center' }}>
          {t('phq9.total', { score: computePhq9Total(answers as number[]) })}
        </AppText>
      ) : null}
      <PrimaryButton label={t('common.save')} disabled={!complete} onPress={() => void save()} />

      {/* Item-9 safety prompt — modal so it cannot be missed */}
      <Modal visible={safetyVisible} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(23,34,46,0.6)',
            justifyContent: 'center',
            padding: spacing.xl,
          }}
        >
          <View style={{ backgroundColor: C.surface, borderRadius: 16, padding: spacing.lg, gap: spacing.md }}>
            <SafetyCard
              title={t('phq9.safetyTitle')}
              body={t('phq9.safetyBody')}
              contact={t('phq9.safetyContact')}
            />
            <PrimaryButton
              label={t('phq9.safetyAck')}
              onPress={() => {
                setSafetyVisible(false);
                router.back();
              }}
            />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
