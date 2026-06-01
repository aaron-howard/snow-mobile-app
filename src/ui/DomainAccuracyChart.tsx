import { StyleSheet, Text, View } from 'react-native';

import { useTheme, useThemedStyles } from './theme';
import type { Theme } from './theme';

export interface DomainAccuracyDatum {
  domainId: string;
  name: string;
  correct: number;
  total: number;
}

export interface DomainAccuracyChartProps {
  data: readonly DomainAccuracyDatum[];
}

function bandColor(theme: Theme, percent: number): string {
  if (percent >= 80) return theme.bandSuccess;
  if (percent >= 50) return theme.bandWarning;
  return theme.bandDanger;
}

function percentOf(correct: number, total: number): number {
  return total === 0 ? 0 : Math.round((correct / total) * 100);
}

/**
 * Per-domain accuracy bar chart (Requirements 6.2, 10.4). Each row pairs a bar
 * with an explicit percentage + count label so information is never conveyed by
 * color alone.
 */
export function DomainAccuracyChart({ data }: DomainAccuracyChartProps) {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.wrap} accessibilityRole="summary">
      {data.map((datum) => {
        const percent = percentOf(datum.correct, datum.total);
        const color = bandColor(theme, percent);
        return (
          <View
            key={datum.domainId}
            style={styles.row}
            accessibilityRole="text"
            accessibilityLabel={`${datum.name}: ${percent}% accuracy, ${datum.correct} of ${datum.total} correct`}
          >
            <View style={styles.rowHeader}>
              <Text style={styles.name} numberOfLines={1}>
                {datum.name}
              </Text>
              <Text style={styles.percent}>
                {percent}% ({datum.correct}/{datum.total})
              </Text>
            </View>
            <View style={styles.track}>
              <View
                style={[styles.fill, { width: `${percent}%`, backgroundColor: color }]}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    wrap: {
      gap: 14,
    },
    row: {
      gap: 6,
    },
    rowHeader: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    name: {
      color: theme.cardText,
      flexShrink: 1,
      fontSize: 14,
      fontWeight: '600',
    },
    percent: {
      color: theme.cardMuted,
      fontSize: 13,
      fontVariant: ['tabular-nums'],
      fontWeight: '700',
    },
    track: {
      backgroundColor: theme.cardTrack,
      borderRadius: 6,
      height: 12,
      overflow: 'hidden',
    },
    fill: {
      borderRadius: 6,
      height: 12,
    },
  });
