import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pill } from 'lucide-react-native';

import { AppText } from '../../src/components/AppText';
import { getAllEntriesDesc, type EntryWithDetail } from '../../src/db/repository';
import { C, radius, spacing } from '../../src/theme/tokens';

export default function HistoryScreen() {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<EntryWithDetail[]>([]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const all = await getAllEntriesDesc();
        if (!cancelled) setEntries(all);
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <View style={{ padding: spacing.lg, paddingBottom: 0 }}>
        <AppText weight="bold" size="xl" style={{ marginBottom: spacing.sm }}>
          {t('diary.title')}
        </AppText>
      </View>
      <FlatList
        data={entries}
        keyExtractor={(e) => e.entryDate}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}
        ListEmptyComponent={
          <AppText color={C.textSub} style={{ marginTop: spacing.lg }}>
            {t('diary.empty')}
          </AppText>
        }
        renderItem={({ item }) => <DiaryRow entry={item} />}
      />
    </SafeAreaView>
  );
}

function DiaryRow({ entry }: { entry: EntryWithDetail }) {
  const { t } = useTranslation();
  const headache = entry.hadHeadache;
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <AppText weight="medium" size="sm">
          {entry.entryDate}
        </AppText>
        {entry.detail?.medicineTaken ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Pill size={12} color={C.textFaint} />
            <AppText size="xs" color={C.textFaint}>
              {t('diary.medicineTag')}
            </AppText>
          </View>
        ) : null}
      </View>
      <View
        style={[
          styles.chip,
          { backgroundColor: headache ? '#F9E3DB' : C.goodSoft },
        ]}
      >
        <AppText
          size="xs"
          weight="medium"
          color={headache ? C.chartHeadache : C.good}
        >
          {headache
            ? t('diary.headacheChip', { severity: entry.detail?.severity0_10 ?? '—' })
            : t('diary.noHeadacheChip')}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  chip: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
});
