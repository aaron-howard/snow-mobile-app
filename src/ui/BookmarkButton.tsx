import { useEffect } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

/** Active/inactive transition completes well within the 500 ms budget (Req 7.1, 7.2). */
export const BOOKMARK_ANIM_MS = 200;

export interface BookmarkButtonProps {
  active: boolean;
  onToggle: () => void;
  /** Optional noun for the accessibility label, e.g. "question" or "flashcard". */
  itemLabel?: string;
  disabled?: boolean;
}

/**
 * Bookmark toggle icon with a quick scale/opacity transition between the active
 * (filled) and inactive (outline) states (Requirements 7.1, 7.2). The
 * accessibility label reflects the current state (Requirement 10.1).
 */
export function BookmarkButton({
  active,
  onToggle,
  itemLabel = 'item',
  disabled = false,
}: BookmarkButtonProps) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withTiming(active ? 1.15 : 1, { duration: BOOKMARK_ANIM_MS });
  }, [active, scale]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const label = active ? `Remove bookmark for this ${itemLabel}` : `Bookmark this ${itemLabel}`;

  return (
    <Pressable
      onPress={onToggle}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active, disabled }}
      hitSlop={8}
      style={styles.pressable}
    >
      <Animated.View style={animatedStyle}>
        <Text style={[styles.icon, active ? styles.iconActive : styles.iconInactive]}>
          {active ? '\u2605' : '\u2606'}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  icon: {
    fontSize: 24,
    lineHeight: 28,
  },
  iconActive: {
    color: '#FACC15',
  },
  iconInactive: {
    color: '#94A3B8',
  },
});
