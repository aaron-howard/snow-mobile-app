import { Pressable, StyleSheet, Text, View } from 'react-native';

export interface ContentStaleWarningProps {
  /** Whether the downloaded content is more than 30 days old. */
  visible: boolean;
  /** Optional handler to refresh content; renders a tappable prompt when provided. */
  onRefresh?: () => void;
}

/**
 * Banner shown when downloaded exam content is more than 30 days old
 * (Requirement 9.8), prompting the user to refresh when connected. Announced to
 * assistive tech and pairs an icon with text (Requirement 10.1).
 */
export function ContentStaleWarning({ visible, onRefresh }: ContentStaleWarningProps) {
  if (!visible) return null;

  const message = '\u24D8 Downloaded content is over 30 days old. Refresh when connected.';

  if (onRefresh) {
    return (
      <Pressable
        style={styles.banner}
        onPress={onRefresh}
        accessibilityRole="button"
        accessibilityLabel="Downloaded content is over 30 days old. Tap to refresh when connected."
        accessibilityLiveRegion="polite"
      >
        <Text style={styles.text}>{message}</Text>
      </Pressable>
    );
  }

  return (
    <View
      style={styles.banner}
      accessibilityRole="alert"
      accessibilityLabel="Downloaded content is over 30 days old. Refresh when connected."
      accessibilityLiveRegion="polite"
    >
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignItems: 'center',
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    width: '100%',
  },
  text: {
    color: '#DBEAFE',
    fontSize: 13,
    fontWeight: '600',
  },
});
