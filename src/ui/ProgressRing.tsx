import { StyleSheet, Text, View } from 'react-native';

import { useTheme, useThemedStyles } from './theme';
import type { Theme } from './theme';

export interface ProgressRingProps {
  /** Readiness score 0–100 (clamped). */
  score: number;
  label?: string;
  size?: number;
  /** Which surface the ring sits on, so neutral text stays legible. */
  tone?: 'onSurface' | 'onCard';
}

/** Score band drives the ring color; the numeric label is always shown so the
 * indicator never relies on color alone (Req 10.4). */
function bandColor(theme: Theme, score: number): string {
  if (score >= 80) return theme.bandSuccess;
  if (score >= 50) return theme.bandWarning;
  return theme.bandDanger;
}

/**
 * Circular readiness indicator (0–100) with a text label (Requirement 6.5).
 * Built from RN primitives (a colored ring + centered number) rather than
 * `react-native-svg` to keep the component dependency-free and reliably
 * testable; the visual is a bordered circle whose color reflects the score band.
 */
export function ProgressRing({
  score,
  label = 'Readiness',
  size = 140,
  tone = 'onSurface',
}: ProgressRingProps) {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const color = bandColor(theme, clamped);
  const dimension = { width: size, height: size, borderRadius: size / 2 };
  const neutral = tone === 'onCard' ? styles.neutralOnCard : styles.neutralOnSurface;

  return (
    <View
      style={styles.wrap}
      accessibilityRole="progressbar"
      accessibilityLabel={`${label}: ${clamped} out of 100`}
      accessibilityValue={{ min: 0, max: 100, now: clamped }}
    >
      <View style={[styles.ring, dimension, { borderColor: color }]}>
        <Text style={[styles.score, { color }]}>{clamped}</Text>
        <Text style={[styles.outOf, neutral]}>/ 100</Text>
      </View>
      <Text style={[styles.label, neutral]}>{label}</Text>
    </View>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
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
      fontSize: 13,
      fontWeight: '600',
    },
    label: {
      fontSize: 15,
      fontWeight: '600',
    },
    neutralOnSurface: {
      color: theme.textSecondary,
    },
    neutralOnCard: {
      color: theme.cardMuted,
    },
  });
