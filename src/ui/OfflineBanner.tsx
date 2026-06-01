import { StyleSheet, Text, View } from 'react-native';

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

const styles = StyleSheet.create({
  banner: {
    alignItems: 'center',
    backgroundColor: '#78350F',
    paddingHorizontal: 12,
    paddingVertical: 8,
    width: '100%',
  },
  text: {
    color: '#FEF3C7',
    fontSize: 13,
    fontWeight: '600',
  },
});
