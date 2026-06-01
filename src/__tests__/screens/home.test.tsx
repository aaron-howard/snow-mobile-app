import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import HomeScreen from '../../../app/(tabs)/index';
import type { UseHomeDashboardResult } from '@domain/analytics/useHomeDashboard';

const mockUseHomeDashboard = jest.fn();
const mockPush = jest.fn();

jest.mock('@domain/analytics/useHomeDashboard', () => ({
  useHomeDashboard: () => mockUseHomeDashboard(),
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

function state(overrides: Partial<UseHomeDashboardResult> = {}): UseHomeDashboardResult {
  return {
    loading: false,
    error: null,
    exams: [
      { examId: 'exam-1', name: 'CSA', readinessScore: 72, currentStreak: 4 },
      { examId: 'exam-2', name: 'CAD', readinessScore: 35, currentStreak: 0 },
    ],
    ...overrides,
  };
}

describe('HomeScreen', () => {
  beforeEach(() => {
    mockUseHomeDashboard.mockReset();
    mockPush.mockReset();
    mockUseHomeDashboard.mockReturnValue(state());
  });

  test('renders an active study list with readiness and streak per exam', () => {
    render(<HomeScreen />);
    expect(screen.getByText('CSA')).toBeTruthy();
    expect(screen.getByText('CAD')).toBeTruthy();
    expect(screen.getByLabelText('Readiness: 72 out of 100')).toBeTruthy();
    expect(screen.getByLabelText('Current streak: 4 days')).toBeTruthy();
  });

  test('quick actions navigate to the exam study routes', () => {
    render(<HomeScreen />);
    fireEvent.press(screen.getByLabelText('Start Quiz for CSA'));
    expect(mockPush).toHaveBeenCalledWith('/exam/exam-1/quiz');

    fireEvent.press(screen.getByLabelText('Start Simulator for CAD'));
    expect(mockPush).toHaveBeenCalledWith('/exam/exam-2/simulator');
  });

  test('shows an empty state with a catalog link when no exams are enrolled', () => {
    mockUseHomeDashboard.mockReturnValue(state({ exams: [] }));
    render(<HomeScreen />);
    fireEvent.press(screen.getByLabelText('Browse the exam catalog'));
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/catalog');
  });

  test('surfaces load errors', () => {
    mockUseHomeDashboard.mockReturnValue(state({ error: 'boom', exams: [] }));
    render(<HomeScreen />);
    expect(screen.getByText('boom')).toBeTruthy();
  });
});
