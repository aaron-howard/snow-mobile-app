import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import ProfileScreen from '../../../app/(tabs)/profile';
import type { UseProfileResult } from '@domain/analytics/useProfile';
import type { UseNotificationSettingsResult } from '@domain/notifications/useNotificationSettings';
import type { NotificationSettingsDTO } from '@db/repositories/types';

const mockUseProfile = jest.fn();
jest.mock('@/domain/analytics/useProfile', () => ({
  useProfile: () => mockUseProfile(),
}));

const mockUseNotificationSettings = jest.fn();
jest.mock('@/domain/notifications/useNotificationSettings', () => ({
  useNotificationSettings: () => mockUseNotificationSettings(),
}));

const baseNotificationSettings: NotificationSettingsDTO = {
  userId: 'u1',
  dailyReminderEnabled: true,
  dailyReminderTime: '20:00',
  streakRiskEnabled: true,
  congratulatoryEnabled: true,
  readiness80Enabled: true,
  quietHoursStart: null,
  quietHoursEnd: null,
};

function notificationState(
  overrides: Partial<UseNotificationSettingsResult> = {},
): UseNotificationSettingsResult {
  return {
    loading: false,
    error: null,
    settings: baseNotificationSettings,
    permission: 'granted',
    update: jest.fn(),
    requestPermission: jest.fn(),
    ...overrides,
  };
}

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
    mockUseNotificationSettings.mockReset();
    mockUseNotificationSettings.mockReturnValue(notificationState());
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

  test('renders notification toggles and persists changes (Req 8.4)', () => {
    const update = jest.fn();
    mockUseNotificationSettings.mockReturnValue(notificationState({ update }));
    const { getByLabelText } = render(<ProfileScreen />);

    const streakToggle = getByLabelText('Streak-risk alerts');
    expect(streakToggle).toBeTruthy();
    fireEvent(streakToggle, 'valueChange', false);
    expect(update).toHaveBeenCalledWith({ streakRiskEnabled: false });
  });

  test('shows an in-app prompt when notifications are blocked (Req 8.5)', () => {
    const requestPermission = jest.fn();
    mockUseNotificationSettings.mockReturnValue(
      notificationState({ permission: 'denied', requestPermission }),
    );
    const { getByLabelText } = render(<ProfileScreen />);
    const prompt = getByLabelText('Notifications are blocked. Tap to enable them in Settings.');
    fireEvent.press(prompt);
    expect(requestPermission).toHaveBeenCalled();
  });
});
