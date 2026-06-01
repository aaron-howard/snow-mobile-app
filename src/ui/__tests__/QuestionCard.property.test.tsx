// Feature: servicenow-cert-study-app, Property 7
//
// Property 7 — Every question rendered in a quiz has at least 4 answer choices.
//
// For any question presented with 4 or more choices, the rendered QuestionCard
// SHALL display all of them (never fewer than 4).
//
// Validates: Requirements 3.1.

import React from 'react';
import { render } from '@testing-library/react-native';
import fc from 'fast-check';
import { QuestionCard } from '../QuestionCard';
import type { AnswerChoiceRecord, QuestionRecord } from '@domain/practice';

const baseQuestion: QuestionRecord = {
  id: 'q1',
  examId: 'exam-1',
  domainId: 'dom-1',
  blueprintSkillId: 'bp-1',
  text: 'Sample question?',
  imageUrl: null,
  imageAltText: 'Sample question accessible description',
  explanation: 'Because.',
  difficultyLevel: 'medium',
  bloomsLevel: 'apply',
  authorId: 'author-1',
  sourceNotes: '',
  reviewStatus: 'published',
  reviewedBy: null,
  reviewedAt: null,
  publishedAt: 1,
  timesAnswered: 0,
  timesAnsweredCorrectly: 0,
  isPoolReset: false,
  createdAt: 1,
  updatedAt: 1,
};

const choiceArb = (index: number): fc.Arbitrary<AnswerChoiceRecord> =>
  fc.record({
    id: fc.constant(`choice-${index}`),
    questionId: fc.constant('q1'),
    text: fc.string({ minLength: 1, maxLength: 40 }),
    isCorrect: fc.constant(index === 0),
    sortOrder: fc.constant(index),
  });

const choicesArb = fc
  .integer({ min: 4, max: 8 })
  .chain((count) => fc.tuple(...Array.from({ length: count }, (_unused, i) => choiceArb(i))));

describe('QuestionCard — Property 7', () => {
  test('renders at least 4 answer choices for any valid question', () => {
    fc.assert(
      fc.property(choicesArb, (choices) => {
        const { getAllByTestId, unmount } = render(
          <QuestionCard
            question={baseQuestion}
            choices={choices}
            selectedAnswerId={null}
            result={null}
            onSelect={() => {}}
          />,
        );
        const rendered = getAllByTestId('answer-choice');
        unmount();
        return rendered.length >= 4 && rendered.length === choices.length;
      }),
      { numRuns: 50 },
    );
  });
});
