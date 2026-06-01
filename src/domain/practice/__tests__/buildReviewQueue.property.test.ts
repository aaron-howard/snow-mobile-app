// Feature: servicenow-cert-study-app, Property 5
//
// Property 5 — Review queue contains all incorrect answers ordered by
// descending incorrect count.
//
// For any set of answered questions, the Review queue SHALL contain every
// question with incorrectCount > 0, SHALL exclude every correct-only question
// (incorrectCount === 0), and SHALL never place a lower incorrect count before
// a higher one.
//
// Validates: Requirements 3.5, 3.6.

import fc from 'fast-check';
import { buildReviewQueue, type ReviewQueueCandidate } from '../buildReviewQueue';

const candidateArb: fc.Arbitrary<ReviewQueueCandidate> = fc.record({
  questionId: fc.string({ minLength: 1 }),
  incorrectCount: fc.nat({ max: 50 }),
});

describe('buildReviewQueue — Property 5', () => {
  test('includes exactly the incorrect questions, ordered by descending count', () => {
    fc.assert(
      fc.property(fc.array(candidateArb, { maxLength: 40 }), (candidates) => {
        const queue = buildReviewQueue(candidates);

        // No correct-only questions appear.
        if (queue.some((c) => c.incorrectCount === 0)) return false;

        // Every incorrect question is present (compare counts of incorrects).
        const incorrectInput = candidates.filter((c) => c.incorrectCount > 0).length;
        if (queue.length !== incorrectInput) return false;

        // Descending order is preserved.
        for (let i = 1; i < queue.length; i += 1) {
          if (queue[i - 1]!.incorrectCount < queue[i]!.incorrectCount) return false;
        }
        return true;
      }),
      { numRuns: 200 },
    );
  });

  test('does not mutate the input array', () => {
    const input: ReviewQueueCandidate[] = [
      { questionId: 'a', incorrectCount: 0 },
      { questionId: 'b', incorrectCount: 3 },
    ];
    const snapshot = [...input];
    buildReviewQueue(input);
    expect(input).toEqual(snapshot);
  });

  test('returns empty when nothing was answered incorrectly', () => {
    expect(
      buildReviewQueue([
        { questionId: 'a', incorrectCount: 0 },
        { questionId: 'b', incorrectCount: 0 },
      ]),
    ).toEqual([]);
  });
});
