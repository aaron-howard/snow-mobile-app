// Feature: servicenow-cert-study-app, Property 10
//
// Property 10 — Spaced repetition interval ratio (Still Learning ≤ 50% of
// Known).
//
// For any SRS state, the interval after a "Still Learning" response (quality
// 0–2) SHALL be no more than 50% of the interval after a "Known" response
// (quality 3–5) on the same card, regardless of prior repetition history.
//
// Validates: Requirements 4.8.

import fc from 'fast-check';
import { SpacedRepetitionEngine } from '../SpacedRepetitionEngine';
import type { FlashcardSRSState, ResponseQuality } from '../types';

const stateArb: fc.Arbitrary<FlashcardSRSState> = fc.record({
  easeFactor: fc.double({ min: 1.3, max: 4, noNaN: true }),
  intervalDays: fc.integer({ min: 0, max: 365 }),
  repetitionCount: fc.integer({ min: 0, max: 50 }),
  nextReviewAt: fc.integer({ min: 0, max: 1_900_000_000_000 }),
});

const stillQualityArb = fc.constantFrom<ResponseQuality>(0, 1, 2);
const knownQualityArb = fc.constantFrom<ResponseQuality>(3, 4, 5);

describe('SpacedRepetitionEngine.computeNextInterval — Property 10', () => {
  test('Still Learning interval is at most half the Known interval', () => {
    fc.assert(
      fc.property(stateArb, stillQualityArb, knownQualityArb, (card, stillQ, knownQ) => {
        const still = SpacedRepetitionEngine.computeNextInterval(card, stillQ, 0);
        const known = SpacedRepetitionEngine.computeNextInterval(card, knownQ, 0);
        return still.intervalDays <= 0.5 * known.intervalDays;
      }),
      { numRuns: 300 },
    );
  });
});
