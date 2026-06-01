// Feature: servicenow-cert-study-app, Property 12
//
// Property 12 — Swipe-left re-inserts card at least 3 positions ahead.
//
// For any deck session with at least 4 remaining cards, swiping a card left
// ("Still Learning") SHALL re-insert it at a position at least 3 cards ahead of
// its current position in the active pool.
//
// Validates: Requirements 4.6.

import fc from 'fast-check';
import { FLASHCARD_REINSERT_OFFSET, FlashcardSessionManager } from '../FlashcardSessionManager';

describe('FlashcardSessionManager.swipeLeft — Property 12', () => {
  test('re-inserts the swiped card at least 3 positions ahead', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 4, max: 30 }).chain((len) =>
          fc.record({
            // Unique ids so we can locate the re-inserted card unambiguously.
            cards: fc.constant(Array.from({ length: len }, (_unused, i) => `card-${i}`)),
            // Keep currentIndex + 3 within bounds so the offset is fully applied.
            currentIndex: fc.integer({ min: 0, max: len - 4 }),
          }),
        ),
        ({ cards, currentIndex }) => {
          const card = cards[currentIndex]!;
          const next = FlashcardSessionManager.swipeLeft(cards, currentIndex);

          // Same cards, same count — nothing lost or duplicated.
          if (next.length !== cards.length) return false;
          const newIndex = next.indexOf(card);
          return newIndex >= currentIndex + FLASHCARD_REINSERT_OFFSET;
        },
      ),
      { numRuns: 300 },
    );
  });

  test('swipeRight removes the current card from the pool', () => {
    const pool = ['a', 'b', 'c', 'd'];
    expect(FlashcardSessionManager.swipeRight(pool, 1)).toEqual(['a', 'c', 'd']);
  });

  test('clamps re-insertion to the end when fewer than 3 cards follow', () => {
    const pool = ['a', 'b', 'c', 'd'];
    // currentIndex 2: rest = [a,b,d], target = min(5,3) = 3 (end).
    const next = FlashcardSessionManager.swipeLeft(pool, 2);
    expect(next).toEqual(['a', 'b', 'd', 'c']);
  });
});
