import { StyleSheet, Text, View } from 'react-native';

export interface DomainAccuracyDatum {
  domainId: string;
  name: string;
  correct: number;
  total: number;
}

export interface DomainAccuracyChartProps {
  data: readonly DomainAccuracyDatum[];
}

function bandColor(percent: number): string {
  if (percent >= 80) return '#16A34A';
  if (percent >= 50) return '#D97706';
  return '#DC2626';
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
  return (
    <View style={styles.wrap} accessibilityRole="summary">
      {data.map((datum) => {
        const percent = percentOf(datum.correct, datum.total);
        const color = bandColor(percent);
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

const styles = StyleSheet.create({
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
    color: '#0F172A',
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  percent: {
    color: '#475569',
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  track: {
    backgroundColor: '#E2E8F0',
    borderRadius: 6,
    height: 12,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: 6,
    height: 12,
  },
});
