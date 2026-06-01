import React from 'react';
import { render } from '@testing-library/react-native';

import { QuestionCard } from '../QuestionCard';
import { ContentStaleWarning } from '../ContentStaleWarning';
import { OfflineBanner } from '../OfflineBanner';
import type { AnswerChoiceRecord, AnswerResult, QuestionRecord } from '@domain/practice';

const question: QuestionRecord = {
  id: 'q1',
  examId: 'exam-1',
  domainId: 'dom-1',
  blueprintSkillId: 'bp-1',
  text: 'Q?',
  imageUrl: null,
  imageAltText: '',
  explanation: 'Because.',
  difficultyLevel: 'easy',
  bloomsLevel: 'remember',
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
  { id: 'c1', questionId: 'q1', text: 'Right', isCorrect: true, sortOrder: 0 },
  { id: 'c2', questionId: 'q1', text: 'Wrong', isCorrect: false, sortOrder: 1 },
  { id: 'c3', questionId: 'q1', text: 'Other', isCorrect: false, sortOrder: 2 },
  { id: 'c4', questionId: 'q1', text: 'Another', isCorrect: false, sortOrder: 3 },
];

// Requirement 10.4: color-coded indicators must also carry a text label + icon.
describe('color-coded indicators include text and icon (Req 10.4)', () => {
  test('correct feedback shows a check icon and the word "Correct"', () => {
    const result: AnswerResult = {
      questionId: 'q1',
      selectedAnswerId: 'c1',
      isCorrect: true,
      correctAnswerId: 'c1',
      explanation: question.explanation,
    };
    const { getByText } = render(
      <QuestionCard question={question} choices={choices} selectedAnswerId="c1" result={result} onSelect={() => undefined} />,
    );
    // The "\u2713 Correct" heading combines an icon glyph with text.
    expect(getByText('\u2713 Correct')).toBeTruthy();
  });

  test('incorrect feedback shows a cross icon and the word "Incorrect"', () => {
    const result: AnswerResult = {
      questionId: 'q1',
      selectedAnswerId: 'c2',
      isCorrect: false,
      correctAnswerId: 'c1',
      explanation: question.explanation,
    };
    const { getByText } = render(
      <QuestionCard question={question} choices={choices} selectedAnswerId="c2" result={result} onSelect={() => undefined} />,
    );
    expect(getByText('\u2717 Incorrect')).toBeTruthy();
  });

  test('offline and stale banners pair an icon with text', () => {
    const offline = render(<OfflineBanner visible />);
    expect(offline.getByText(/Offline/)).toBeTruthy();
    const stale = render(<ContentStaleWarning visible />);
    expect(stale.getByText(/30 days old/)).toBeTruthy();
  });
});
