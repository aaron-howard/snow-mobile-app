// Feature: servicenow-cert-study-app, Property 14
//
// Property 14 — Simulator results calculation is correct.
//
// For any set of answer records, the result SHALL report the correct score,
// pass/fail status, per-domain breakdown, and incorrect-question list.
//
// Validates: Requirements 5.6.

import fc from 'fast-check';
import { calculateSimulatorResult } from '../calculateSimulatorResult';
import type { SimulatorGradingQuestion } from '../calculateSimulatorResult';

interface Generated {
  id: string;
  domainId: string;
  correctAnswerId: string;
  selected: string | null; // null = unanswered
}

const recordArb = (id: string): fc.Arbitrary<Generated> =>
  fc.record({
    id: fc.constant(id),
    domainId: fc.constantFrom('d1', 'd2', 'd3'),
    correctAnswerId: fc.constantFrom('A', 'B', 'C', 'D'),
    // Selected is the correct answer, a wrong answer, or unanswered.
    selected: fc.constantFrom('A', 'B', 'C', 'D', null),
  });

const questionsArb = fc
  .uniqueArray(fc.string({ minLength: 1, maxLength: 6 }), { minLength: 0, maxLength: 30 })
  .chain((ids) => fc.tuple(...ids.map(recordArb))) as fc.Arbitrary<Generated[]>;

describe('calculateSimulatorResult — Property 14', () => {
  test('score, pass/fail, breakdown, and incorrect list are all correct', () => {
    fc.assert(
      fc.property(questionsArb, fc.integer({ min: 0, max: 100 }), (generated, threshold) => {
        const questions: SimulatorGradingQuestion[] = generated.map((g) => ({
          id: g.id,
          domainId: g.domainId,
          explanation: `why-${g.id}`,
          correctAnswerId: g.correctAnswerId,
        }));
        const answers: Record<string, string> = {};
        for (const g of generated) {
          if (g.selected !== null) answers[g.id] = g.selected;
        }

        const result = calculateSimulatorResult(
          { sessionId: 's1', answers, passingThreshold: threshold },
          questions,
        );

        const expectedCorrect = generated.filter((g) => g.selected === g.correctAnswerId).length;
        const total = generated.length;
        const expectedScore = total === 0 ? 0 : Math.round((expectedCorrect / total) * 100);
        const expectedIncorrectIds = generated
          .filter((g) => g.selected !== g.correctAnswerId)
          .map((g) => g.id)
          .sort();

        // Per-domain expectation.
        const domainOk = result.domainBreakdown.every((d) => {
          const inDomain = generated.filter((g) => g.domainId === d.domainId);
          const correctInDomain = inDomain.filter((g) => g.selected === g.correctAnswerId).length;
          return d.total === inDomain.length && d.correct === correctInDomain;
        });

        const incorrectIds = result.incorrectQuestions.map((q) => q.questionId).sort();

        return (
          result.correctAnswers === expectedCorrect &&
          result.incorrectAnswers === total - expectedCorrect &&
          result.scorePercent === expectedScore &&
          result.passed === expectedScore >= threshold &&
          domainOk &&
          JSON.stringify(incorrectIds) === JSON.stringify(expectedIncorrectIds)
        );
      }),
      { numRuns: 300 },
    );
  });

  test('unanswered questions count as incorrect and appear with explanations', () => {
    const result = calculateSimulatorResult(
      { sessionId: 's1', answers: { q1: 'A' }, passingThreshold: 70 },
      [
        { id: 'q1', domainId: 'd1', explanation: 'e1', correctAnswerId: 'A' },
        { id: 'q2', domainId: 'd1', explanation: 'e2', correctAnswerId: 'B' },
      ],
    );
    expect(result.scorePercent).toBe(50);
    expect(result.passed).toBe(false);
    expect(result.incorrectQuestions).toEqual([{ questionId: 'q2', explanation: 'e2' }]);
  });
});
