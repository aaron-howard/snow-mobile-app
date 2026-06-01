// Feature: servicenow-cert-study-app, Property 11
//
// Property 11 — SM-2 ease factor never falls below 1.3.
//
// For any flashcard and any arbitrarily long sequence of response qualities
// (0–5), the ease factor SHALL remain ≥ 1.3 after every repetition.
//
// Validates: Requirements 4.8.

import fc from 'fast-check';
import { MIN_EASE_FACTOR, SpacedRepetitionEngine } from '../SpacedRepetitionEngine';
import type { FlashcardSRSState, ResponseQuality } from '../types';

const stateArb: fc.Arbitrary<FlashcardSRSState> = fc.record({
  easeFactor: fc.double({ min: 1.3, max: 4, noNaN: true }),
  intervalDays: fc.integer({ min: 0, max: 365 }),
  repetitionCount: fc.integer({ min: 0, max: 50 }),
  nextReviewAt: fc.constant(0),
});

const qualitiesArb = fc.array(fc.integer({ min: 0, max: 5 }), { minLength: 1, maxLength: 40 });

describe('SpacedRepetitionEngine.computeNextInterval — Property 11', () => {
  test('ease factor stays >= 1.3 after every repetition in any sequence', () => {
    fc.assert(
      fc.property(stateArb, qualitiesArb, (initial, qualities) => {
        let card = initial;
        for (const q of qualities) {
          card = SpacedRepetitionEngine.computeNextInterval(card, q as ResponseQuality, 0);
          if (card.easeFactor < MIN_EASE_FACTOR) return false;
        }
        return true;
      }),
      { numRuns: 300 },
    );
  });
});
