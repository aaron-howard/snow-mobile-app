import * as Notifications from 'expo-notifications';
import {
  addNotificationResponseRouter,
  buildReminderFireDate,
  derivePermissionState,
  ensureNotificationPermissions,
  rescheduleDailyReminder,
} from '../notificationService';
import type { NotificationSettingsDTO } from '@db/repositories/types';

// jest.mock is hoisted above the imports above by babel-jest.
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn().mockResolvedValue(undefined),
  scheduleNotificationAsync: jest.fn().mockResolvedValue('id'),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(undefined),
  setNotificationHandler: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));

const baseSettings: NotificationSettingsDTO = {
  userId: 'u1',
  dailyReminderEnabled: true,
  dailyReminderTime: '20:00',
  streakRiskEnabled: true,
  congratulatoryEnabled: true,
  readiness80Enabled: true,
  quietHoursStart: null,
  quietHoursEnd: null,
};

describe('derivePermissionState', () => {
  test('granted maps to granted', () => {
    expect(derivePermissionState({ granted: true, canAskAgain: true })).toBe('granted');
  });
  test('not granted but can ask again is undetermined', () => {
    expect(derivePermissionState({ granted: false, canAskAgain: true })).toBe('undetermined');
  });
  test('not granted and cannot ask again is denied (Req 8.5)', () => {
    expect(derivePermissionState({ granted: false, canAskAgain: false })).toBe('denied');
  });
});

describe('buildReminderFireDate', () => {
  test('returns null when daily reminder disabled', () => {
    expect(buildReminderFireDate({ ...baseSettings, dailyReminderEnabled: false })).toBeNull();
  });

  test('reschedules out of quiet hours when configured', () => {
    const now = new Date(2026, 5, 1, 12, 0, 0, 0);
    const fire = buildReminderFireDate(
      { ...baseSettings, dailyReminderTime: '23:00', quietHoursStart: '22:00', quietHoursEnd: '07:00' },
      now,
    );
    // 23:00 falls in quiet hours -> moved to 07:00 the next day.
    expect(fire?.getHours()).toBe(7);
    expect(fire?.getDate()).toBe(2);
  });
});

describe('ensureNotificationPermissions', () => {
  beforeEach(() => jest.clearAllMocks());

  test('returns granted without prompting when already granted', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true, canAskAgain: true });
    await expect(ensureNotificationPermissions()).resolves.toBe('granted');
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  test('returns denied when blocked and cannot ask again', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false, canAskAgain: false });
    await expect(ensureNotificationPermissions()).resolves.toBe('denied');
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  test('prompts and maps the request result', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false, canAskAgain: true });
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true, canAskAgain: false });
    await expect(ensureNotificationPermissions()).resolves.toBe('granted');
    expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
  });
});

describe('rescheduleDailyReminder', () => {
  beforeEach(() => jest.clearAllMocks());

  test('cancels and schedules when enabled', async () => {
    await rescheduleDailyReminder(baseSettings, new Date(2026, 5, 1, 8, 0, 0, 0));
    expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
  });

  test('cancels but does not schedule when disabled', async () => {
    await rescheduleDailyReminder({ ...baseSettings, dailyReminderEnabled: false });
    expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });
});

describe('addNotificationResponseRouter (deep-link routing, Req 8.6)', () => {
  test('routes a congratulatory tap to the progress dashboard', () => {
    let captured: ((r: unknown) => void) | undefined;
    (Notifications.addNotificationResponseReceivedListener as jest.Mock).mockImplementation((cb) => {
      captured = cb;
      return { remove: jest.fn() };
    });
    const navigate = jest.fn();
    addNotificationResponseRouter(navigate);

    captured?.({
      notification: { request: { content: { data: { type: 'congratulatory' } } } },
    });
    expect(navigate).toHaveBeenCalledWith('/(tabs)/progress');
  });
});
