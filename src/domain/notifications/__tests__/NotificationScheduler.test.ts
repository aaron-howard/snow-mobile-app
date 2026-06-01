import { NotificationScheduler, STREAK_RISK_CUTOFF_HOUR } from '../NotificationScheduler';
import { notificationRoute } from '../types';
import type { ScoreHistoryEntry } from '@domain/analytics';

describe('NotificationScheduler.computeReminderFireTime', () => {
  test('schedules later today when the time has not yet passed', () => {
    const today = new Date(2026, 5, 1, 8, 0, 0, 0); // 08:00
    const fire = NotificationScheduler.computeReminderFireTime('20:00', today);
    expect(fire.getDate()).toBe(1);
    expect(fire.getHours()).toBe(20);
    expect(fire.getMinutes()).toBe(0);
  });

  test('rolls to tomorrow when the time has already passed', () => {
    const today = new Date(2026, 5, 1, 21, 0, 0, 0); // 21:00
    const fire = NotificationScheduler.computeReminderFireTime('20:00', today);
    expect(fire.getDate()).toBe(2);
    expect(fire.getHours()).toBe(20);
  });

  test('rejects malformed times', () => {
    expect(() => NotificationScheduler.computeReminderFireTime('25:00', new Date())).toThrow();
    expect(() => NotificationScheduler.computeReminderFireTime('bad', new Date())).toThrow();
  });
});

describe('NotificationScheduler.rescheduleForQuietHours', () => {
  test('non-wrapping window: moves an in-window time to quiet-end', () => {
    const scheduled = new Date(2026, 5, 1, 1, 30, 0, 0); // 01:30 inside 01:00–06:00
    const out = NotificationScheduler.rescheduleForQuietHours(scheduled, '01:00', '06:00');
    expect(out.getHours()).toBe(6);
    expect(out.getMinutes()).toBe(0);
    expect(out.getDate()).toBe(1);
  });

  test('leaves a time outside the window untouched', () => {
    const scheduled = new Date(2026, 5, 1, 9, 0, 0, 0);
    const out = NotificationScheduler.rescheduleForQuietHours(scheduled, '22:00', '07:00');
    expect(out.getTime()).toBe(scheduled.getTime());
  });

  test('wrapping window evening portion moves to next-day quiet-end', () => {
    const scheduled = new Date(2026, 5, 1, 23, 0, 0, 0); // 23:00 inside 22:00–07:00
    const out = NotificationScheduler.rescheduleForQuietHours(scheduled, '22:00', '07:00');
    expect(out.getDate()).toBe(2);
    expect(out.getHours()).toBe(7);
  });

  test('wrapping window morning portion moves to same-day quiet-end', () => {
    const scheduled = new Date(2026, 5, 1, 3, 0, 0, 0); // 03:00 inside 22:00–07:00
    const out = NotificationScheduler.rescheduleForQuietHours(scheduled, '22:00', '07:00');
    expect(out.getDate()).toBe(1);
    expect(out.getHours()).toBe(7);
  });
});

describe('NotificationScheduler.shouldSendStreakRisk', () => {
  const day = 24 * 60 * 60 * 1000;
  const today = new Date(2026, 5, 1, STREAK_RISK_CUTOFF_HOUR, 30, 0, 0); // 20:30
  const yesterday = new Date(today.getTime() - day);

  test('fires at/after 8 PM when no session today but studied yesterday', () => {
    expect(NotificationScheduler.shouldSendStreakRisk([yesterday], today)).toBe(true);
  });

  test('does not fire before the cutoff hour', () => {
    const earlier = new Date(2026, 5, 1, 18, 0, 0, 0);
    expect(NotificationScheduler.shouldSendStreakRisk([yesterday], earlier)).toBe(false);
  });

  test('does not fire when a session already happened today', () => {
    expect(NotificationScheduler.shouldSendStreakRisk([yesterday, today], today)).toBe(false);
  });

  test('does not fire when there is no active streak (no session yesterday)', () => {
    expect(NotificationScheduler.shouldSendStreakRisk([], today)).toBe(false);
  });
});

describe('NotificationScheduler.shouldSendCongratulatory (unit)', () => {
  test('blocks within the 24h cooldown regardless of gain', () => {
    const history: ScoreHistoryEntry[] = [
      { score: 40, recordedAt: 0 },
      { score: 80, recordedAt: 1000 },
    ];
    expect(NotificationScheduler.shouldSendCongratulatory(history, 500, 1000)).toBe(false);
  });

  test('returns false for empty history', () => {
    expect(NotificationScheduler.shouldSendCongratulatory([], null, 1)).toBe(false);
  });
});

describe('notificationRoute (deep-link routing, Req 8.6)', () => {
  test('routes each notification type to its screen', () => {
    expect(notificationRoute('daily_reminder')).toBe('/(tabs)');
    expect(notificationRoute('streak_risk')).toBe('/(tabs)');
    expect(notificationRoute('congratulatory')).toBe('/(tabs)/progress');
    expect(notificationRoute('readiness_80')).toBe('/(tabs)/progress');
  });
});
