import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { useTranslation } from 'react-i18next';

import { AppText } from './AppText';
import { C, fontSize, spacing } from '../theme/tokens';

/**
 * Severity 0–10 slider.
 *
 * Drag behaviour must be identical in Nepali and English, so:
 *  - the value shown while dragging is LOCAL state; the parent is notified
 *    only on release (onSlidingComplete). Updating the parent on every frame
 *    re-rendered the whole check-in screen, which is far heavier in Nepali
 *    (Devanagari font resolution + taller line-height on every AppText) and
 *    made the thumb stutter;
 *  - the numeral is drawn in a fixed-height box with the Latin font and an
 *    explicit lineHeight, so the row never changes height between languages
 *    or when the value goes from one digit to two.
 */
function SeveritySliderInner({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const { t } = useTranslation();
  const [display, setDisplay] = useState(value);

  // Sync when the parent changes the value from outside the drag
  // (e.g. loading an existing entry for editing).
  useEffect(() => setDisplay(value), [value]);

  return (
    <View>
      <View style={styles.readout} accessibilityLabel={`${display}/10`}>
        <Text style={styles.number} allowFontScaling={false}>
          {display}
        </Text>
      </View>
      <Slider
        minimumValue={0}
        maximumValue={10}
        step={1}
        value={value}
        onValueChange={setDisplay}
        onSlidingComplete={onChange}
        minimumTrackTintColor={C.primary}
        maximumTrackTintColor={C.border}
        thumbTintColor={C.primaryDark}
        accessibilityLabel={t('checkin.severity')}
      />
      <View style={styles.labels}>
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

const READOUT_HEIGHT = 44;

const styles = StyleSheet.create({
  readout: {
    height: READOUT_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  number: {
    // Latin font + fixed metrics in both languages: numerals are Latin in the
    // ne and en bundles alike, and this keeps the row height constant.
    fontFamily: 'NotoSans-Bold',
    fontSize: fontSize.xxl,
    lineHeight: READOUT_HEIGHT,
    color: C.primaryDark,
    textAlign: 'center',
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
});

/** Memoised so unrelated parent re-renders never touch the slider mid-drag. */
export const SeveritySlider = React.memo(SeveritySliderInner);
