// Feature: servicenow-cert-study-app, Property 6
//
// Property 6 — Quiz answer is attributed to all of the question's domain tags.
//
// For any question tagged with one or more topic domains, answering it SHALL
// produce an attribution under every distinct domain tag — not a subset — each
// carrying the same answer id and correctness.
//
// Validates: Requirements 3.4.

import fc from 'fast-check';
import { recordAttempt } from '../recordAttempt';

describe('recordAttempt — Property 6', () => {
  test('attributes the answer to every distinct domain tag', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.string({ minLength: 1 }),
          domainIds: fc.array(fc.string({ minLength: 1 }), { maxLength: 8 }),
        }),
        fc.record({ id: fc.string({ minLength: 1 }), isCorrect: fc.boolean() }),
        (question, answer) => {
          const attributions = recordAttempt(question, answer);
          const distinctDomains = new Set(question.domainIds);

          // One attribution per distinct domain — no more, no fewer.
          if (attributions.length !== distinctDomains.size) return false;

          const covered = new Set(attributions.map((a) => a.domainId));
          for (const domainId of distinctDomains) {
            if (!covered.has(domainId)) return false;
          }

          // Each attribution carries the question + answer details unchanged.
          return attributions.every(
            (a) =>
              a.questionId === question.id &&
              a.answerId === answer.id &&
              a.isCorrect === answer.isCorrect,
          );
        },
      ),
      { numRuns: 200 },
    );
  });

  test('a question with no domains yields no attributions', () => {
    expect(recordAttempt({ id: 'q1', domainIds: [] }, { id: 'a1', isCorrect: true })).toEqual([]);
  });

  test('de-duplicates repeated domain tags', () => {
    const out = recordAttempt(
      { id: 'q1', domainIds: ['d1', 'd1', 'd2'] },
      { id: 'a1', isCorrect: false },
    );
    expect(out.map((a) => a.domainId)).toEqual(['d1', 'd2']);
  });
});
