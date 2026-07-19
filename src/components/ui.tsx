import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppText } from './AppText';
import { C, radius, spacing } from '../theme/tokens';

/** Shared UI kit: Screen, QuestionCard, ChoicePill, PillGroup, buttons, inputs. */

export function Screen({ children, scroll = true }: { children: React.ReactNode; scroll?: boolean }) {
  const content = <View style={styles.screenInner}>{children}</View>;
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

export function ScreenTitle({ text }: { text: string }) {
  return (
    <AppText weight="bold" size="xl" style={{ marginBottom: spacing.md }}>
      {text}
    </AppText>
  );
}

export function QuestionCard({
  title,
  children,
  style,
}: {
  title?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.card, style]}>
      {title ? (
        <AppText weight="medium" size="md" style={{ marginBottom: spacing.sm }}>
          {title}
        </AppText>
      ) : null}
      {children}
    </View>
  );
}

export function ChoicePill({
  label,
  selected,
  onPress,
  compact = false,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  compact?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.pill, compact && styles.pillCompact, selected && styles.pillSelected]}
    >
      <AppText
        size="sm"
        weight={selected ? 'medium' : 'regular'}
        color={selected ? C.textOnPrimary : C.text}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

/** Single-select pill row/wrap. `options` are display labels; value is the index. */
export function PillGroup({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: number | null;
  onChange: (index: number) => void;
}) {
  return (
    <View style={styles.pillWrap}>
      {options.map((label, i) => (
        <ChoicePill key={i} label={label} selected={value === i} onPress={() => onChange(i)} />
      ))}
    </View>
  );
}

/** Multi-select pills over string keys. */
export function MultiPillGroup({
  options,
  values,
  onToggle,
}: {
  options: { key: string; label: string }[];
  values: string[];
  onToggle: (key: string) => void;
}) {
  return (
    <View style={styles.pillWrap}>
      {options.map((o) => (
        <ChoicePill
          key={o.key}
          label={o.label}
          selected={values.includes(o.key)}
          onPress={() => onToggle(o.key)}
        />
      ))}
    </View>
  );
}

export function YesNoChoice({
  value,
  onChange,
  yesLabel,
  noLabel,
}: {
  value: boolean | null;
  onChange: (v: boolean) => void;
  yesLabel: string;
  noLabel: string;
}) {
  return (
    <View style={styles.yesNoRow}>
      {[
        { v: true, label: yesLabel },
        { v: false, label: noLabel },
      ].map(({ v, label }) => (
        <Pressable
          key={String(v)}
          onPress={() => onChange(v)}
          accessibilityRole="button"
          accessibilityState={{ selected: value === v }}
          style={[styles.yesNo, value === v && styles.pillSelected]}
        >
          <AppText
            size="lg"
            weight="medium"
            color={value === v ? C.textOnPrimary : C.text}
          >
            {label}
          </AppText>
        </Pressable>
      ))}
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  destructiveLook = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  destructiveLook?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={[
        styles.primaryBtn,
        destructiveLook && { backgroundColor: C.danger },
        disabled && { opacity: 0.4 },
      ]}
    >
      <AppText weight="medium" size="md" color={C.textOnPrimary}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={styles.secondaryBtn}>
      <AppText weight="medium" size="md" color={C.primaryDark}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function LabeledInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  error,
  secureTextEntry,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'number-pad';
  error?: string | null;
  secureTextEntry?: boolean;
}) {
  const { i18n } = useTranslation();
  return (
    <View style={{ marginBottom: spacing.md }}>
      <AppText size="sm" color={C.textSub} style={{ marginBottom: spacing.xs }}>
        {label}
      </AppText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.textFaint}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        style={[
          styles.input,
          {
            fontFamily:
              i18n.language === 'ne' ? 'NotoSansDevanagari-Regular' : 'NotoSans-Regular',
          },
          error ? { borderColor: C.danger } : null,
        ]}
      />
      {error ? (
        <AppText size="xs" color={C.danger} style={{ marginTop: spacing.xs }}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  screenInner: { padding: spacing.lg, gap: spacing.md },
  scrollContent: { paddingBottom: spacing.xxl },
  card: {
    backgroundColor: C.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: C.border,
    padding: spacing.lg,
  },
  pillWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  pill: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surfaceAlt,
  },
  pillCompact: { paddingVertical: spacing.xs, paddingHorizontal: spacing.md },
  pillSelected: { backgroundColor: C.primary, borderColor: C.primary },
  yesNoRow: { flexDirection: 'row', gap: spacing.md },
  yesNo: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surfaceAlt,
  },
  primaryBtn: {
    backgroundColor: C.primary,
    borderRadius: radius.md,
    alignItems: 'center',
    paddingVertical: spacing.md + 2,
  },
  secondaryBtn: {
    backgroundColor: C.primarySoft,
    borderRadius: radius.md,
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  input: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: radius.sm,
    backgroundColor: C.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: 16,
    color: C.text,
  },
});
