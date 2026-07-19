import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Delete } from 'lucide-react-native';

import { AppText } from './AppText';
import { C, radius, spacing } from '../theme/tokens';

/** Large-target numeric pad for the 4-digit participant PIN. */
export function PinPad({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const press = (d: string) => {
    if (value.length < 4) onChange(value + d);
  };
  const backspace = () => onChange(value.slice(0, -1));

  return (
    <View style={styles.wrap}>
      <View style={styles.dots} accessibilityLabel={`${value.length}/4`}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={[styles.dot, i < value.length && styles.dotFilled]} />
        ))}
      </View>
      <View style={styles.grid}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '<'].map((k, i) =>
          k === '' ? (
            <View key={i} style={styles.key} />
          ) : k === '<' ? (
            <Pressable key={i} style={styles.key} onPress={backspace} accessibilityRole="button">
              <Delete size={24} color={C.textSub} />
            </Pressable>
          ) : (
            <Pressable
              key={i}
              style={({ pressed }) => [styles.key, styles.digitKey, pressed && styles.keyPressed]}
              onPress={() => press(k)}
              accessibilityRole="button"
              accessibilityLabel={k}
            >
              <AppText weight="medium" size="xl">
                {k}
              </AppText>
            </Pressable>
          ),
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: spacing.xl },
  dots: { flexDirection: 'row', gap: spacing.lg },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  dotFilled: { backgroundColor: C.primary, borderColor: C.primary },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 3 * 72 + 2 * spacing.md,
    gap: spacing.md,
    justifyContent: 'center',
  },
  key: {
    width: 72,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  digitKey: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  keyPressed: { backgroundColor: C.primarySoft },
});
