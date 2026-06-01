import { StyleSheet, Text, View } from 'react-native';

export interface ProgressRingProps {
  /** Readiness score 0–100 (clamped). */
  score: number;
  label?: string;
  size?: number;
}

/** Score band drives the ring color; the numeric label is always shown so the
 * indicator never relies on color alone (Req 10.4). */
function bandColor(score: number): string {
  if (score >= 80) return '#16A34A';
  if (score >= 50) return '#D97706';
  return '#DC2626';
}

/**
 * Circular readiness indicator (0–100) with a text label (Requirement 6.5).
 * Built from RN primitives (a colored ring + centered number) rather than
 * `react-native-svg` to keep the component dependency-free and reliably
 * testable; the visual is a bordered circle whose color reflects the score band.
 */
export function ProgressRing({ score, label = 'Readiness', size = 140 }: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const color = bandColor(clamped);
  const dimension = { width: size, height: size, borderRadius: size / 2 };

  return (
    <View
      style={styles.wrap}
      accessibilityRole="progressbar"
      accessibilityLabel={`${label}: ${clamped} out of 100`}
      accessibilityValue={{ min: 0, max: 100, now: clamped }}
    >
      <View style={[styles.ring, dimension, { borderColor: color }]}>
        <Text style={[styles.score, { color }]}>{clamped}</Text>
        <Text style={styles.outOf}>/ 100</Text>
      </View>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 8,
  },
  ring: {
    alignItems: 'center',
    borderWidth: 10,
    justifyContent: 'center',
  },
  score: {
    fontSize: 40,
    fontWeight: '800',
  },
  outOf: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  label: {
    color: '#334155',
    fontSize: 15,
    fontWeight: '600',
  },
});
