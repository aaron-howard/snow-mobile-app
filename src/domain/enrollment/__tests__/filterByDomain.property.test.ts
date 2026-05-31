// Feature: servicenow-cert-study-app, Property 4
//
// Property 4 — Domain filter returns only matching questions.
//
// For any list of questions and any domain id, every returned question SHALL
// have that domain id, and every returned question SHALL appear in the input.
//
// Validates: Requirements 2.5.

import fc from 'fast-check';
import type { QuestionRecord } from '../types';
import { filterByDomain } from '../filterByDomain';

const questionArb = fc.record({
  id: fc.string(),
  examId: fc.string(),
  domainId: fc.string(),
  blueprintSkillId: fc.string(),
  text: fc.string(),
  imageUrl: fc.constant(null),
  imageAltText: fc.string({ minLength: 1 }),
  explanation: fc.string(),
  difficultyLevel: fc.constantFrom('easy', 'medium', 'hard'),
  bloomsLevel: fc.constantFrom('remember', 'understand', 'apply', 'analyze'),
  authorId: fc.string(),
  sourceNotes: fc.string(),
  reviewStatus: fc.constantFrom('draft', 'reviewed', 'published'),
  reviewedBy: fc.constant(null),
  reviewedAt: fc.constant(null),
  publishedAt: fc.constant(null),
  timesAnswered: fc.nat(),
  timesAnsweredCorrectly: fc.nat(),
  isPoolReset: fc.boolean(),
  createdAt: fc.nat(),
  updatedAt: fc.nat(),
}) as fc.Arbitrary<QuestionRecord>;

describe('filterByDomain — Property 4', () => {
  test('output is subset of input with matching domainId only', () => {
    fc.assert(
      fc.property(fc.array(questionArb, { maxLength: 20 }), fc.string(), (questions, domainId) => {
        const out = filterByDomain(questions, domainId);
        if (out.length > questions.length) return false;
        const inputIds = new Set(questions.map((q) => q.id));
        for (const q of out) {
          if (q.domainId !== domainId) return false;
          if (!inputIds.has(q.id)) return false;
        }
        const expectedCount = questions.filter((q) => q.domainId === domainId).length;
        return out.length === expectedCount;
      }),
      { numRuns: 200 },
    );
  });
});
