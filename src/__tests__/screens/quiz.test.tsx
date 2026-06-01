import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ examId: 'exam-1' }),
  useRouter: () => ({ back: jest.fn() }),
}));

const mockUseQuiz = jest.fn();
jest.mock('@domain/practice/useQuiz', () => ({
  useQuiz: (...args: unknown[]) => mockUseQuiz(...args),
}));

import QuizScreen from '../../../app/exam/[examId]/quiz';
import type { AnswerChoiceRecord, QuestionRecord, QuizSession } from '@domain/practice';
import type { UseQuizResult } from '@domain/practice/useQuiz';

const question: QuestionRecord = {
  id: 'q1',
  examId: 'exam-1',
  domainId: 'dom-1',
  blueprintSkillId: 'bp-1',
  text: 'Sample question?',
  imageUrl: null,
  imageAltText: 'Sample question description',
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
  { id: 'c1', questionId: 'q1', text: 'A', isCorrect: true, sortOrder: 0 },
  { id: 'c2', questionId: 'q1', text: 'B', isCorrect: false, sortOrder: 1 },
  { id: 'c3', questionId: 'q1', text: 'C', isCorrect: false, sortOrder: 2 },
  { id: 'c4', questionId: 'q1', text: 'D', isCorrect: false, sortOrder: 3 },
];

const sessionFixture: QuizSession = {
  sessionId: 'session-1',
  examId: 'exam-1',
  domainFilter: null,
  isBookmarkSession: false,
  questions: [{ question, choices }],
  poolWasReset: false,
};

function baseState(): UseQuizResult {
  return {
    loading: false,
    error: null,
    session: sessionFixture,
    currentIndex: 0,
    result: null,
    selectedAnswerId: null,
    submitting: false,
    isLastQuestion: true,
    summary: null,
    select: jest.fn().mockResolvedValue(undefined),
    next: jest.fn(),
    finish: jest.fn().mockResolvedValue(undefined),
  };
}

function setup(overrides: Partial<UseQuizResult> = {}) {
  const state: UseQuizResult = { ...baseState(), ...overrides };
  mockUseQuiz.mockReturnValue(state);
  return state;
}

describe('QuizScreen', () => {
  beforeEach(() => {
    mockUseQuiz.mockReset();
    setup();
  });

  test('shows a loading spinner while the session starts', () => {
    setup({ loading: true, session: null });
    const { getByLabelText } = render(<QuizScreen />);
    expect(getByLabelText('Starting quiz')).toBeTruthy();
  });

  test('renders the current question and progress', () => {
    const { getByText, getByLabelText } = render(<QuizScreen />);
    expect(getByText('Sample question?')).toBeTruthy();
    expect(getByLabelText('Question 1 of 1')).toBeTruthy();
  });

  test('tapping a choice calls select', () => {
    const state = setup();
    const { getByLabelText } = render(<QuizScreen />);
    fireEvent.press(getByLabelText('A'));
    expect(state.select).toHaveBeenCalledWith('c1');
  });

  test('shows Finish on the last question once answered and calls finish', () => {
    const state = setup({
      isLastQuestion: true,
      result: {
        questionId: 'q1',
        selectedAnswerId: 'c1',
        isCorrect: true,
        correctAnswerId: 'c1',
        explanation: 'Because.',
      },
      selectedAnswerId: 'c1',
    });
    const { getByLabelText } = render(<QuizScreen />);
    fireEvent.press(getByLabelText('Finish quiz and see summary'));
    expect(state.finish).toHaveBeenCalled();
  });

  test('shows Next (not Finish) when more questions remain', () => {
    const state = setup({
      isLastQuestion: false,
      result: {
        questionId: 'q1',
        selectedAnswerId: 'c1',
        isCorrect: true,
        correctAnswerId: 'c1',
        explanation: 'Because.',
      },
    });
    const { getByLabelText } = render(<QuizScreen />);
    fireEvent.press(getByLabelText('Next question'));
    expect(state.next).toHaveBeenCalled();
  });

  test('shows the pool-refreshed banner when the pool was reset (Req 3.9)', () => {
    setup({
      session: { ...sessionFixture, poolWasReset: true },
    });
    const { getByText } = render(<QuizScreen />);
    expect(getByText(/pool has been refreshed/)).toBeTruthy();
  });

  test('renders the session summary with score and counts (Req 3.3)', () => {
    setup({
      summary: {
        sessionId: 'session-1',
        correctAnswers: 3,
        incorrectAnswers: 1,
        scorePercent: 75,
        domainBreakdown: [{ domainId: 'dom-1', correct: 3, total: 4 }],
        poolWasReset: false,
      },
    });
    const { getByText, getByLabelText } = render(<QuizScreen />);
    expect(getByText('75%')).toBeTruthy();
    expect(getByLabelText('3 correct, 1 incorrect')).toBeTruthy();
  });

  test('shows an empty state when there are no questions', () => {
    setup({ session: { ...sessionFixture, questions: [], poolWasReset: false } });
    const { getByText } = render(<QuizScreen />);
    expect(getByText(/No questions are available/)).toBeTruthy();
  });
});
