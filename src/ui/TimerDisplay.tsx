import { StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from './theme';
import type { Theme } from './theme';

export interface TimerDisplayProps {
  remainingSeconds: number;
  /** Visually + semantically flag the final stretch (does not change layout position). */
  warnAtSeconds?: number;
  paused?: boolean;
}

/** `123` -> `02:03`, `3661` -> `61:01`. Always at least mm:ss. */
export function formatRemaining(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Fixed-position countdown that stays visible without scrolling and announces
 * the remaining time to screen readers (Requirements 5.2, 10.1). The parent
 * drives `remainingSeconds` (updated every second).
 */
export function TimerDisplay({
  remainingSeconds,
  warnAtSeconds = 60,
  paused = false,
}: TimerDisplayProps) {
  const styles = useThemedStyles(makeStyles);
  const formatted = formatRemaining(remainingSeconds);
  const warning = remainingSeconds <= warnAtSeconds && !paused;
  const label = paused
    ? `Timer paused at ${formatted}`
    : `Time remaining: ${formatted}`;

  return (
    <View
      style={[styles.container, warning ? styles.warning : null]}
      accessibilityRole="timer"
      accessibilityLabel={label}
      accessibilityLiveRegion="polite"
    >
      <Text style={styles.label}>{paused ? 'Paused' : 'Time left'}</Text>
      <Text style={[styles.time, warning ? styles.warningText : null]}>{formatted}</Text>
    </View>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      backgroundColor: theme.surface,
      borderBottomColor: theme.border,
      borderBottomWidth: 1,
      flexDirection: 'row',
      gap: 10,
      justifyContent: 'center',
      paddingVertical: 10,
    },
    warning: {
      backgroundColor: theme.dangerSurface,
    },
    label: {
      color: theme.textSecondary,
      fontSize: 13,
      fontWeight: '600',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    time: {
      color: theme.textPrimary,
      fontSize: 20,
      fontVariant: ['tabular-nums'],
      fontWeight: '700',
    },
    warningText: {
      color: theme.onDangerSurface,
    },
  });
