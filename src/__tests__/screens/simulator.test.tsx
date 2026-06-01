import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import SimulatorScreen from '../../../app/exam/[examId]/simulator';
import type { UseSimulatorResult } from '@domain/simulator/useSimulator';
import type { SimulatorSession } from '@domain/simulator';

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ examId: 'exam-1' }),
}));

const mockUseSimulator = jest.fn();
jest.mock('@domain/simulator/useSimulator', () => ({
  useSimulator: (...args: unknown[]) => mockUseSimulator(...args),
}));

const sessionFixture: SimulatorSession = {
  sessionId: 'sim-1',
  examId: 'exam-1',
  questions: [
    {
      question: {
        id: 'q1',
        examId: 'exam-1',
        domainId: 'd1',
        blueprintSkillId: 'bp1',
        text: 'What is a Business Rule?',
        imageUrl: null,
        imageAltText: 'alt',
        explanation: 'Server-side logic',
        difficultyLevel: 'medium',
        bloomsLevel: 'apply',
        authorId: 'a',
        sourceNotes: '',
        reviewStatus: 'published',
        reviewedBy: null,
        reviewedAt: null,
        publishedAt: 0,
        timesAnswered: 0,
        timesAnsweredCorrectly: 0,
        isPoolReset: false,
        createdAt: 0,
        updatedAt: 0,
      },
      choices: [
        { id: 'c1', questionId: 'q1', text: 'A', isCorrect: true, sortOrder: 0 },
        { id: 'c2', questionId: 'q1', text: 'B', isCorrect: false, sortOrder: 1 },
        { id: 'c3', questionId: 'q1', text: 'C', isCorrect: false, sortOrder: 2 },
        { id: 'c4', questionId: 'q1', text: 'D', isCorrect: false, sortOrder: 3 },
      ],
    },
  ],
  answers: {},
  flaggedQuestions: [],
  remainingSeconds: 300,
  state: 'active',
  expiresAt: 0,
};

function baseState(): UseSimulatorResult {
  return {
    phase: 'idle',
    error: null,
    session: null,
    currentIndex: 0,
    remainingSeconds: 0,
    paused: false,
    confirmation: null,
    result: null,
    start: jest.fn().mockResolvedValue(undefined),
    select: jest.fn().mockResolvedValue(undefined),
    toggleFlag: jest.fn().mockResolvedValue(undefined),
    goTo: jest.fn(),
    goNext: jest.fn(),
    goPrev: jest.fn(),
    requestSubmit: jest.fn(),
    cancelSubmit: jest.fn(),
    confirmSubmit: jest.fn().mockResolvedValue(undefined),
    restart: jest.fn().mockResolvedValue(undefined),
    discard: jest.fn().mockResolvedValue(undefined),
  };
}

function setup(overrides: Partial<UseSimulatorResult> = {}) {
  const state: UseSimulatorResult = { ...baseState(), ...overrides };
  mockUseSimulator.mockReturnValue(state);
  return state;
}

describe('SimulatorScreen', () => {
  beforeEach(() => mockUseSimulator.mockReset());

  test('idle phase starts the simulator', () => {
    const start = jest.fn().mockResolvedValue(undefined);
    setup({ phase: 'idle', start });
    const { getByLabelText } = render(<SimulatorScreen />);
    fireEvent.press(getByLabelText('Start exam simulator'));
    expect(start).toHaveBeenCalled();
  });

  test('active phase renders the timer and current question with flag control (Req 5.2, 5.3)', () => {
    setup({ phase: 'active', session: sessionFixture, currentIndex: 0, remainingSeconds: 300 });
    const { getByText, getByLabelText } = render(<SimulatorScreen />);
    expect(getByLabelText('Time remaining: 05:00')).toBeTruthy();
    expect(getByText('Question 1 of 1')).toBeTruthy();
    expect(getByText('What is a Business Rule?')).toBeTruthy();
    expect(getByLabelText('Flag this question for review')).toBeTruthy();
  });

  test('requesting submission opens a confirmation dialog with counts (Req 5.5)', () => {
    setup({
      phase: 'active',
      session: sessionFixture,
      confirmation: { total: 1, answered: 0, unanswered: 1, flagged: 1 },
    });
    const { getByText } = render(<SimulatorScreen />);
    expect(getByText('Submit exam?')).toBeTruthy();
    expect(getByText('You have 1 unanswered and 1 flagged question.')).toBeTruthy();
  });

  test('confirm submission calls confirmSubmit', () => {
    const confirmSubmit = jest.fn().mockResolvedValue(undefined);
    setup({
      phase: 'active',
      session: sessionFixture,
      confirmation: { total: 1, answered: 1, unanswered: 0, flagged: 0 },
      confirmSubmit,
    });
    const { getByLabelText } = render(<SimulatorScreen />);
    fireEvent.press(getByLabelText('Confirm submission'));
    expect(confirmSubmit).toHaveBeenCalled();
  });

  test('result phase shows score, pass/fail, and incorrect questions (Req 5.6)', () => {
    setup({
      phase: 'result',
      session: sessionFixture,
      result: {
        sessionId: 'sim-1',
        correctAnswers: 0,
        incorrectAnswers: 1,
        scorePercent: 0,
        passed: false,
        passingThreshold: 70,
        domainBreakdown: [{ domainId: 'd1', correct: 0, total: 1 }],
        incorrectQuestions: [{ questionId: 'q1', explanation: 'Server-side logic' }],
      },
    });
    const { getByText } = render(<SimulatorScreen />);
    expect(getByText('0%')).toBeTruthy();
    expect(getByText('FAIL · threshold 70%')).toBeTruthy();
    expect(getByText('Server-side logic')).toBeTruthy();
    expect(getByText('What is a Business Rule?')).toBeTruthy();
  });

  test('restore_error phase offers restart and discard (Req 5.9)', () => {
    const restart = jest.fn().mockResolvedValue(undefined);
    const discard = jest.fn().mockResolvedValue(undefined);
    setup({ phase: 'restore_error', error: 'Saved progress no longer matches.', restart, discard });
    const { getByLabelText } = render(<SimulatorScreen />);
    fireEvent.press(getByLabelText('Restart session'));
    fireEvent.press(getByLabelText('Discard session'));
    expect(restart).toHaveBeenCalled();
    expect(discard).toHaveBeenCalled();
  });
});
