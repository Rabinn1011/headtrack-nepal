import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Info, TriangleAlert, Leaf, ShieldAlert } from 'lucide-react-native';

import { AppText } from './AppText';
import { C, radius, spacing } from '../theme/tokens';
import type { RuleLevel } from '../rules/types';

export function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <AppText weight="bold" size="xl" color={C.primaryDark}>
        {value}
      </AppText>
      <AppText size="xs" color={C.textSub} style={{ textAlign: 'center' }}>
        {label}
      </AppText>
    </View>
  );
}

const levelStyles: Record<RuleLevel, { bg: string; fg: string }> = {
  warning: { bg: C.warningSoft, fg: C.warning },
  info: { bg: C.infoSoft, fg: C.info },
  good: { bg: C.goodSoft, fg: C.good },
};

export function NoteCard({
  level,
  title,
  body,
}: {
  level: RuleLevel;
  title: string;
  body: string;
}) {
  const s = levelStyles[level];
  const Icon = level === 'warning' ? TriangleAlert : level === 'info' ? Info : Leaf;
  return (
    <View style={[styles.note, { backgroundColor: s.bg }]}>
      <Icon size={20} color={s.fg} style={{ marginTop: 2 }} />
      <View style={{ flex: 1 }}>
        <AppText weight="medium" size="sm" color={s.fg}>
          {title}
        </AppText>
        <AppText size="sm" color={C.text}>
          {body}
        </AppText>
      </View>
    </View>
  );
}

/** The PHQ-9 item-9 safety prompt — visually distinct from and above all rule notes. */
export function SafetyCard({ title, body, contact }: { title: string; body: string; contact: string }) {
  return (
    <View style={[styles.note, styles.safety]}>
      <ShieldAlert size={22} color={C.danger} style={{ marginTop: 2 }} />
      <View style={{ flex: 1 }}>
        <AppText weight="bold" size="md" color={C.danger}>
          {title}
        </AppText>
        <AppText size="sm" color={C.text}>
          {body}
        </AppText>
        <AppText size="sm" weight="medium" color={C.text} style={{ marginTop: spacing.xs }}>
          {contact}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stat: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    gap: 2,
  },
  note: {
    flexDirection: 'row',
    gap: spacing.md,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  safety: {
    backgroundColor: C.dangerSoft,
    borderWidth: 1,
    borderColor: C.danger,
  },
});
