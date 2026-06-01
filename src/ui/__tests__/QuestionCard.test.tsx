import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { QuestionCard } from '../QuestionCard';
import type { AnswerChoiceRecord, AnswerResult, QuestionRecord } from '@domain/practice';

const question: QuestionRecord = {
  id: 'q1',
  examId: 'exam-1',
  domainId: 'dom-1',
  blueprintSkillId: 'bp-1',
  text: 'Which artifact runs server-side?',
  imageUrl: null,
  imageAltText: 'Diagram comparing client and server scripts',
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

const correctResult: AnswerResult = {
  questionId: 'q1',
  selectedAnswerId: 'c1',
  isCorrect: true,
  correctAnswerId: 'c1',
  explanation: question.explanation,
};

const incorrectResult: AnswerResult = {
  questionId: 'q1',
  selectedAnswerId: 'c2',
  isCorrect: false,
  correctAnswerId: 'c1',
  explanation: question.explanation,
};

describe('QuestionCard', () => {
  test('renders the question text and all answer choices', () => {
    const { getByText, getAllByTestId } = render(
      <QuestionCard
        question={question}
        choices={choices}
        selectedAnswerId={null}
        result={null}
        onSelect={() => {}}
      />,
    );
    expect(getByText('Which artifact runs server-side?')).toBeTruthy();
    expect(getAllByTestId('answer-choice')).toHaveLength(4);
  });

  test('calls onSelect with the choice id when tapped', () => {
    const onSelect = jest.fn();
    const { getByLabelText } = render(
      <QuestionCard
        question={question}
        choices={choices}
        selectedAnswerId={null}
        result={null}
        onSelect={onSelect}
      />,
    );
    fireEvent.press(getByLabelText('Business Rule'));
    expect(onSelect).toHaveBeenCalledWith('c1');
  });

  test('renders an image with its alt text when the question has one', () => {
    const { getByLabelText } = render(
      <QuestionCard
        question={{ ...question, imageUrl: 'https://example.com/diagram.png' }}
        choices={choices}
        selectedAnswerId={null}
        result={null}
        onSelect={() => {}}
      />,
    );
    expect(getByLabelText('Diagram comparing client and server scripts')).toBeTruthy();
  });

  test('shows correct feedback with a text label (not color alone) and the explanation', () => {
    const { getByText } = render(
      <QuestionCard
        question={question}
        choices={choices}
        selectedAnswerId="c1"
        result={correctResult}
        onSelect={() => {}}
      />,
    );
    expect(getByText(/Correct/)).toBeTruthy();
    expect(getByText('Business Rules run on the server.')).toBeTruthy();
  });

  test('shows incorrect feedback and marks the correct choice with an accessible label', () => {
    const { getByText, getByLabelText } = render(
      <QuestionCard
        question={question}
        choices={choices}
        selectedAnswerId="c2"
        result={incorrectResult}
        onSelect={() => {}}
      />,
    );
    expect(getByText(/Incorrect/)).toBeTruthy();
    expect(getByLabelText('Business Rule. Correct answer.')).toBeTruthy();
    expect(getByLabelText('Client Script. Your answer, incorrect.')).toBeTruthy();
  });

  test('disables choices once answered', () => {
    const onSelect = jest.fn();
    const { getByLabelText } = render(
      <QuestionCard
        question={question}
        choices={choices}
        selectedAnswerId="c1"
        result={correctResult}
        onSelect={onSelect}
      />,
    );
    fireEvent.press(getByLabelText('UI Policy'));
    expect(onSelect).not.toHaveBeenCalled();
  });
});
