// Feature: servicenow-cert-study-app, Property 13
//
// Property 13 — Simulator submission confirmation counts are accurate.
//
// For any session with random answered/flagged states, the confirmation
// summary SHALL report the exact number of unanswered and flagged questions.
//
// Validates: Requirements 5.5.

import fc from 'fast-check';
import { buildConfirmationSummary } from '../buildConfirmationSummary';

interface GeneratedQuestion {
  id: string;
  answered: boolean;
  flagged: boolean;
}

const questionsArb = fc
  .uniqueArray(fc.string({ minLength: 1, maxLength: 6 }), { minLength: 0, maxLength: 40 })
  .chain((ids) =>
    fc.tuple(
      ...ids.map((id) =>
        fc.record({
          id: fc.constant(id),
          answered: fc.boolean(),
          flagged: fc.boolean(),
        }),
      ),
    ),
  ) as fc.Arbitrary<GeneratedQuestion[]>;

describe('buildConfirmationSummary — Property 13', () => {
  test('reports exact unanswered and flagged counts', () => {
    fc.assert(
      fc.property(questionsArb, (generated) => {
        const questions = generated.map((g) => ({ question: { id: g.id } }));
        const answers: Record<string, string> = {};
        const flaggedQuestions: string[] = [];
        let expectedAnswered = 0;
        let expectedFlagged = 0;
        for (const g of generated) {
          if (g.answered) {
            answers[g.id] = `ans-${g.id}`;
            expectedAnswered += 1;
          }
          if (g.flagged) {
            flaggedQuestions.push(g.id);
            expectedFlagged += 1;
          }
        }

        const summary = buildConfirmationSummary({ questions, answers, flaggedQuestions });
        return (
          summary.total === generated.length &&
          summary.answered === expectedAnswered &&
          summary.unanswered === generated.length - expectedAnswered &&
          summary.flagged === expectedFlagged
        );
      }),
      { numRuns: 300 },
    );
  });

  test('ignores flagged ids that are not part of the session', () => {
    const summary = buildConfirmationSummary({
      questions: [{ question: { id: 'q1' } }, { question: { id: 'q2' } }],
      answers: { q1: 'a1' },
      flaggedQuestions: ['q2', 'ghost', 'q2'],
    });
    expect(summary).toEqual({ total: 2, answered: 1, unanswered: 1, flagged: 1 });
  });
});
