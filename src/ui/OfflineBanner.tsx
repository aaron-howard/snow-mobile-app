import { StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from './theme';
import type { Theme } from './theme';

export interface OfflineBannerProps {
  /** Whether the device is currently offline. */
  visible: boolean;
}

/**
 * Persistent header banner shown while the device has no internet connection
 * (Requirement 9.7). Announced politely to assistive tech and pairs an icon with
 * text so the state is never conveyed by color alone (Requirement 10.1).
 */
export function OfflineBanner({ visible }: OfflineBannerProps) {
  const styles = useThemedStyles(makeStyles);
  if (!visible) return null;
  return (
    <View
      style={styles.banner}
      accessibilityRole="alert"
      accessibilityLabel="You are offline. Your progress is saved and will sync when you reconnect."
      accessibilityLiveRegion="polite"
    >
      <Text style={styles.text}>{'\u26A0'} Offline — changes will sync when you reconnect</Text>
    </View>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    banner: {
      alignItems: 'center',
      backgroundColor: theme.warningSurface,
      paddingHorizontal: 12,
      paddingVertical: 8,
      width: '100%',
    },
    text: {
      color: theme.onWarningSurface,
      fontSize: 13,
      fontWeight: '600',
    },
  });
