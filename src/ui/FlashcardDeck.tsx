import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import type { FlashcardRecord } from '@domain/flashcards';

/** Flip animation duration — must complete within 300 ms (Requirement 4.4). */
export const FLIP_DURATION_MS = 300;
const SWIPE_THRESHOLD = 80;

export interface FlashcardDeckProps {
  /** The current card, or null when the deck/session has no cards. */
  card: FlashcardRecord | null;
  onSwipeKnown: () => void;
  onSwipeStillLearning: () => void;
  /** Invoked from the empty-deck state to start creating a custom card (Req 4.3). */
  onCreateRequest?: () => void;
}

/**
 * Swipeable, flippable flashcard (Requirements 4.2–4.6).
 *
 * Shows the term by default and flips to the definition on tap within 300 ms
 * (Reanimated). A horizontal pan gesture marks the card Known (right) or Still
 * Learning (left); equivalent accessible buttons provide a non-gesture path
 * (Req 10.1). When there is no card, an empty-deck message offers to create one.
 */
export function FlashcardDeck({
  card,
  onSwipeKnown,
  onSwipeStillLearning,
  onCreateRequest,
}: FlashcardDeckProps) {
  const [flipped, setFlipped] = useState(false);
  const rotation = useSharedValue(0);

  useEffect(() => {
    setFlipped(false);
    rotation.value = 0;
  }, [card?.id, rotation]);

  const flip = useCallback(() => {
    setFlipped((prev) => {
      const nextFlipped = !prev;
      rotation.value = withTiming(nextFlipped ? 180 : 0, { duration: FLIP_DURATION_MS });
      return nextFlipped;
    });
  }, [rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 800 }, { rotateY: `${rotation.value}deg` }],
  }));

  const pan = Gesture.Pan().onEnd((event) => {
    'worklet';
    if (event.translationX > SWIPE_THRESHOLD) {
      runOnJS(onSwipeKnown)();
    } else if (event.translationX < -SWIPE_THRESHOLD) {
      runOnJS(onSwipeStillLearning)();
    }
  });

  if (!card) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyText} accessibilityRole="text">
          This deck has no flashcards yet.
        </Text>
        {onCreateRequest ? (
          <Pressable
            style={styles.primaryButton}
            onPress={onCreateRequest}
            accessibilityRole="button"
            accessibilityLabel="Create a flashcard"
          >
            <Text style={styles.primaryLabel}>Create a flashcard</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <GestureDetector gesture={pan}>
        <Pressable
          onPress={flip}
          accessibilityRole="button"
          accessibilityState={{ expanded: flipped }}
          accessibilityHint="Double tap to flip the card"
          accessibilityLabel={
            flipped ? `Definition: ${card.definition}` : `Term: ${card.term}. Tap to reveal the definition.`
          }
        >
          <Animated.View style={[styles.card, animatedStyle]}>
            <Text style={styles.sideLabel}>{flipped ? 'Definition' : 'Term'}</Text>
            <Text style={styles.faceText}>{flipped ? card.definition : card.term}</Text>
          </Animated.View>
        </Pressable>
      </GestureDetector>

      <View style={styles.actions}>
        <Pressable
          style={[styles.actionButton, styles.stillButton]}
          onPress={onSwipeStillLearning}
          accessibilityRole="button"
          accessibilityLabel="Mark still learning"
        >
          <Text style={styles.actionLabel}>↺ Still learning</Text>
        </Pressable>
        <Pressable
          style={[styles.actionButton, styles.knownButton]}
          onPress={onSwipeKnown}
          accessibilityRole="button"
          accessibilityLabel="Mark known"
        >
          <Text style={styles.actionLabel}>✓ Known</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 16,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    justifyContent: 'center',
    minHeight: 220,
    padding: 24,
  },
  sideLabel: {
    color: '#60A5FA',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  faceText: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '600',
    lineHeight: 30,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    alignItems: 'center',
    borderRadius: 10,
    flex: 1,
    paddingVertical: 14,
  },
  stillButton: {
    backgroundColor: '#7C2D12',
  },
  knownButton: {
    backgroundColor: '#14532D',
  },
  actionLabel: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '600',
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 15,
    marginBottom: 16,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  primaryLabel: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '600',
  },
});
