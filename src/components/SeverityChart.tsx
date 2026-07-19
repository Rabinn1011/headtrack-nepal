import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { VictoryAxis, VictoryBar, VictoryChart } from 'victory-native';
import { useTranslation } from 'react-i18next';

import { AppText } from './AppText';
import { C, radius, spacing } from '../theme/tokens';
import type { EntryWithDetail } from '../db/repository';
import { addDays } from '../db/repository';

type ChartDay = {
  x: number;
  y: number;
  dayLabel: string;
  hadHeadache: boolean;
  logged: boolean;
};

/** Height stub so headache-free (severity 0) days stay visible against the baseline. */
const FREE_DAY_STUB = 0.4;

export function SeverityChart({
  entries,
  today,
}: {
  entries: EntryWithDetail[];
  today: string;
}) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();

  const byDate = new Map(entries.map((e) => [e.entryDate, e]));
  const days: ChartDay[] = Array.from({ length: 14 }, (_, i) => {
    const date = addDays(today, -(13 - i));
    const entry = byDate.get(date);
    return {
      x: i + 1,
      y: entry ? (entry.hadHeadache ? Math.max(entry.detail?.severity0_10 ?? 1, FREE_DAY_STUB) : FREE_DAY_STUB) : 0,
      dayLabel: date.slice(8), // day of month
      hadHeadache: entry?.hadHeadache ?? false,
      logged: Boolean(entry),
    };
  });

  return (
    <View style={styles.card}>
      <AppText weight="medium" size="sm" style={{ marginBottom: spacing.xs }}>
        {t('summary.chartTitle')}
      </AppText>
      <VictoryChart
        width={width - spacing.lg * 2 - spacing.lg}
        height={190}
        domain={{ y: [0, 10] }}
        domainPadding={{ x: 12 }}
        padding={{ top: 18, bottom: 28, left: 30, right: 8 }}
      >
        <VictoryAxis
          dependentAxis
          tickValues={[0, 5, 10]}
          style={{
            axis: { stroke: 'transparent' },
            grid: { stroke: C.border, strokeWidth: 1 },
            tickLabels: { fill: C.chartAxis, fontSize: 10, fontFamily: 'NotoSans-Regular' },
          }}
        />
        <VictoryAxis
          tickValues={days.map((d) => d.x)}
          tickFormat={(x: number) => (x % 2 === 1 ? days[x - 1]?.dayLabel ?? '' : '')}
          style={{
            axis: { stroke: C.border },
            tickLabels: { fill: C.chartAxis, fontSize: 9, fontFamily: 'NotoSans-Regular' },
          }}
        />
        <VictoryBar
          data={days.filter((d) => d.logged)}
          barWidth={12}
          cornerRadius={{ top: 3 }}
          labels={({ datum }: { datum?: ChartDay }) =>
            datum?.hadHeadache && datum.y >= 1 ? String(datum.y) : ''
          }
          style={{
            data: {
              fill: ({ datum }: { datum?: ChartDay }) =>
                datum?.hadHeadache ? C.chartHeadache : C.chartFree,
            },
            labels: { fill: C.textSub, fontSize: 9, fontFamily: 'NotoSans-Regular' },
          }}
        />
      </VictoryChart>
      <View style={styles.legend}>
        <LegendItem color={C.chartHeadache} label={t('summary.legendHeadache')} />
        <LegendItem color={C.chartFree} label={t('summary.legendFree')} />
      </View>
    </View>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.swatch, { backgroundColor: color }]} />
      <AppText size="xs" color={C.textSub}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  legend: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.xs },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  swatch: { width: 10, height: 10, borderRadius: 3 },
});
