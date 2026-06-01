import React from 'react';
import { render } from '@testing-library/react-native';

import ProfileScreen from '../../../app/(tabs)/profile';
import type { UseProfileResult } from '@domain/analytics/useProfile';

const mockUseProfile = jest.fn();
jest.mock('@/domain/analytics/useProfile', () => ({
  useProfile: () => mockUseProfile(),
}));

function profileState(overrides: Partial<UseProfileResult> = {}): UseProfileResult {
  return {
    loading: false,
    error: null,
    currentStreak: 5,
    longestStreak: 12,
    totalQuestionsAnswered: 340,
    totalStudySessions: 27,
    ...overrides,
  };
}

describe('ProfileScreen', () => {
  beforeEach(() => {
    mockUseProfile.mockReset();
    mockUseProfile.mockReturnValue(profileState());
  });

  test('displays streaks and totals (Req 6.8)', () => {
    const { getByLabelText } = render(<ProfileScreen />);
    expect(getByLabelText('Current streak: 5 days')).toBeTruthy();
    expect(getByLabelText('Longest streak: 12 days')).toBeTruthy();
    expect(getByLabelText('Questions answered: 340')).toBeTruthy();
    expect(getByLabelText('Study sessions: 27')).toBeTruthy();
  });

  test('shows a spinner while loading', () => {
    mockUseProfile.mockReturnValue(profileState({ loading: true }));
    const { getByLabelText, queryByLabelText } = render(<ProfileScreen />);
    expect(getByLabelText('Loading your profile')).toBeTruthy();
    expect(queryByLabelText('Current streak: 5 days')).toBeNull();
  });

  test('surfaces an error', () => {
    mockUseProfile.mockReturnValue(profileState({ error: 'boom' }));
    const { getByText } = render(<ProfileScreen />);
    expect(getByText('boom')).toBeTruthy();
  });
});
