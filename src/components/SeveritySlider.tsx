import React from 'react';
import { View } from 'react-native';
import Slider from '@react-native-community/slider';
import { useTranslation } from 'react-i18next';

import { AppText } from './AppText';
import { C, spacing } from '../theme/tokens';

export function SeveritySlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const { t } = useTranslation();
  return (
    <View>
      <AppText
        weight="bold"
        size="xxl"
        color={C.primaryDark}
        style={{ textAlign: 'center' }}
        accessibilityLabel={`${value}/10`}
      >
        {value}
      </AppText>
      <Slider
        minimumValue={0}
        maximumValue={10}
        step={1}
        value={value}
        onValueChange={onChange}
        minimumTrackTintColor={C.primary}
        maximumTrackTintColor={C.border}
        thumbTintColor={C.primaryDark}
        accessibilityLabel={t('checkin.severity')}
      />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs }}>
        <AppText size="xs" color={C.textSub}>
          {t('checkin.severityLow')}
        </AppText>
        <AppText size="xs" color={C.textSub}>
          {t('checkin.severityHigh')}
        </AppText>
      </View>
    </View>
  );
}
