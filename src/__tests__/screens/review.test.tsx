import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ examId: 'exam-1' }),
}));

const mockUseReviewQueue = jest.fn();
jest.mock('@domain/practice/useReviewQueue', () => ({
  useReviewQueue: (...args: unknown[]) => mockUseReviewQueue(...args),
}));

import ReviewScreen from '../../../app/exam/[examId]/review';
import type { QuestionRecord } from '@domain/practice';

function makeQuestion(id: string, text: string): QuestionRecord {
  return {
    id,
    examId: 'exam-1',
    domainId: 'dom-1',
    blueprintSkillId: 'bp-1',
    text,
    imageUrl: null,
    imageAltText: text,
    explanation: '',
    difficultyLevel: 'medium',
    bloomsLevel: 'apply',
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
}

function setup(overrides: Partial<{ loading: boolean; error: string | null; questions: QuestionRecord[] }> = {}) {
  const state = {
    loading: false,
    error: null as string | null,
    questions: [] as QuestionRecord[],
    refresh: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  mockUseReviewQueue.mockReturnValue(state);
  return state;
}

describe('ReviewScreen', () => {
  beforeEach(() => {
    mockUseReviewQueue.mockReset();
    setup();
  });

  test('renders the heading', () => {
    const { getByRole } = render(<ReviewScreen />);
    expect(getByRole('header', { name: 'Review queue' })).toBeTruthy();
  });

  test('shows an empty-state message when nothing has been missed', () => {
    setup({ questions: [] });
    const { getByText } = render(<ReviewScreen />);
    expect(getByText(/Nothing to review yet/)).toBeTruthy();
  });

  test('lists review questions in the order provided by the hook (Req 3.6)', () => {
    setup({
      questions: [makeQuestion('q1', 'Hardest question'), makeQuestion('q2', 'Next hardest')],
    });
    const { getByLabelText } = render(<ReviewScreen />);
    expect(getByLabelText('Review question 1: Hardest question')).toBeTruthy();
    expect(getByLabelText('Review question 2: Next hardest')).toBeTruthy();
  });

  test('shows an error banner when loading fails', () => {
    setup({ error: 'Could not load your Review queue. Please try again.' });
    const { getByText } = render(<ReviewScreen />);
    expect(getByText(/Could not load your Review queue/)).toBeTruthy();
  });
});
