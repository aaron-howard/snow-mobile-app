// Feature: servicenow-cert-study-app, Property 25
//
// Property 25 — Every interactive element has a non-empty accessibility label:
// for each shared component, every rendered element with an interactive
// accessibility role exposes a non-empty `accessibilityLabel`.
//
// Validates: Requirements 10.1.

import React from 'react';
import { render } from '@testing-library/react-native';
import fc from 'fast-check';

import { BookmarkButton } from '../BookmarkButton';
import { ContentStaleWarning } from '../ContentStaleWarning';
import { OfflineBanner } from '../OfflineBanner';
import { EnrollmentLimitWarning } from '../EnrollmentLimitWarning';
import { QuestionCard } from '../QuestionCard';
import type { AnswerChoiceRecord, AnswerResult, QuestionRecord } from '@domain/practice';

/** Minimal shape of a react-test-renderer instance we inspect (no @types dep). */
interface TestNode {
  props: { accessibilityRole?: unknown; accessibilityLabel?: unknown };
}

const INTERACTIVE_ROLES = new Set([
  'button',
  'link',
  'switch',
  'checkbox',
  'radio',
  'adjustable',
  'togglebutton',
  'menuitem',
  'tab',
]);

const question: QuestionRecord = {
  id: 'q1',
  examId: 'exam-1',
  domainId: 'dom-1',
  blueprintSkillId: 'bp-1',
  text: 'Which artifact runs server-side?',
  imageUrl: null,
  imageAltText: 'Diagram',
  explanation: 'Business Rules run on the server.',
  difficultyLevel: 'medium',
  bloomsLevel: 'understand',
  authorId: 'a1',
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

const choices: AnswerChoiceRecord[] = [
  { id: 'c1', questionId: 'q1', text: 'Business Rule', isCorrect: true, sortOrder: 0 },
  { id: 'c2', questionId: 'q1', text: 'Client Script', isCorrect: false, sortOrder: 1 },
  { id: 'c3', questionId: 'q1', text: 'UI Policy', isCorrect: false, sortOrder: 2 },
  { id: 'c4', questionId: 'q1', text: 'UI Action', isCorrect: false, sortOrder: 3 },
];

const answeredResult: AnswerResult = {
  questionId: 'q1',
  selectedAnswerId: 'c2',
  isCorrect: false,
  correctAnswerId: 'c1',
  explanation: question.explanation,
};

interface Case {
  name: string;
  element: React.ReactElement;
  /** Whether at least one interactive element is expected. */
  expectInteractive: boolean;
}

const cases: Case[] = [
  {
    name: 'BookmarkButton',
    element: <BookmarkButton active onToggle={() => undefined} itemLabel="question" />,
    expectInteractive: true,
  },
  {
    name: 'ContentStaleWarning (refresh)',
    element: <ContentStaleWarning visible onRefresh={() => undefined} />,
    expectInteractive: true,
  },
  {
    name: 'OfflineBanner',
    element: <OfflineBanner visible />,
    expectInteractive: false,
  },
  {
    name: 'EnrollmentLimitWarning',
    element: <EnrollmentLimitWarning visible onDismiss={() => undefined} />,
    expectInteractive: true,
  },
  {
    name: 'QuestionCard (answered)',
    element: (
      <QuestionCard
        question={question}
        choices={choices}
        selectedAnswerId="c2"
        result={answeredResult}
        onSelect={() => undefined}
      />
    ),
    expectInteractive: true,
  },
];

describe('shared components — Property 25', () => {
  test('every interactive element exposes a non-empty accessibilityLabel', () => {
    fc.assert(
      fc.property(fc.constantFrom(...cases), (testCase) => {
        const view = render(testCase.element);
        const interactive = view.root.findAll((node: TestNode) => {
          const role = node.props?.accessibilityRole;
          return typeof role === 'string' && INTERACTIVE_ROLES.has(role);
        });
        const allLabeled = interactive.every((node: TestNode) => {
          const label = node.props.accessibilityLabel;
          return typeof label === 'string' && label.trim().length > 0;
        });
        const meetsExpectation = testCase.expectInteractive ? interactive.length > 0 : true;
        view.unmount();
        return allLabeled && meetsExpectation;
      }),
      { numRuns: cases.length * 10 },
    );
  });
});
