import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { NotificationScheduler, notificationRoute } from '@domain/notifications';
import type { NotificationPayload } from '@domain/notifications';
import type { NotificationSettingsDTO } from '@db/repositories/types';

/** Coarse permission state the UI reacts to (Req 8.5). */
export type PermissionState = 'granted' | 'denied' | 'undetermined';

/** Shape of the bits of an Expo permission response we depend on (kept local for testability). */
export interface PermissionLike {
  granted: boolean;
  canAskAgain: boolean;
}

/**
 * Pure mapping of an Expo permission response to our coarse state. When the OS
 * has denied permission and will not re-prompt, we surface 'denied' so the app
 * can show an in-app prompt to open Settings (Requirement 8.5).
 */
export function derivePermissionState(perm: PermissionLike): PermissionState {
  if (perm.granted) return 'granted';
  if (!perm.canAskAgain) return 'denied';
  return 'undetermined';
}

/**
 * Compute the next daily-reminder fire time from settings, applying quiet-hours
 * rescheduling (Req 8.1, 8.4). Returns null when the daily reminder is disabled.
 * Pure — no scheduling side effects.
 */
export function buildReminderFireDate(
  settings: NotificationSettingsDTO,
  now: Date = new Date(),
): Date | null {
  if (!settings.dailyReminderEnabled) return null;
  let fire = NotificationScheduler.computeReminderFireTime(settings.dailyReminderTime, now);
  if (settings.quietHoursStart && settings.quietHoursEnd) {
    fire = NotificationScheduler.rescheduleForQuietHours(
      fire,
      settings.quietHoursStart,
      settings.quietHoursEnd,
    );
  }
  return fire;
}

/** Foreground presentation config. Safe to call once at startup. */
export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/** Read the current permission state without prompting. */
export async function getPermissionState(): Promise<PermissionState> {
  const current = await Notifications.getPermissionsAsync();
  return derivePermissionState(current);
}

/**
 * Request OS notification permissions, prompting only if not already granted,
 * and return the resulting coarse state (Req 8.5).
 */
export async function ensureNotificationPermissions(): Promise<PermissionState> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return 'granted';
  if (!current.canAskAgain) return 'denied';
  const requested = await Notifications.requestPermissionsAsync();
  return derivePermissionState(requested);
}

/**
 * Cancel existing schedules and (re)schedule the daily reminder from settings.
 * Other notification types (streak-risk, congratulatory, readiness-80) are
 * decided at runtime by the scheduler functions and posted on demand.
 */
export async function rescheduleDailyReminder(
  settings: NotificationSettingsDTO,
  now: Date = new Date(),
): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  const fire = buildReminderFireDate(settings, now);
  if (!fire) return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('study-reminders', {
      name: 'Study reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const data: NotificationPayload = { type: 'daily_reminder' };
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Time to study',
      body: 'Keep your streak alive — a few questions go a long way.',
      data,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: fire,
    },
  });
}

/**
 * Subscribe to notification taps and route them to the correct screen (Req 8.6).
 * Returns the subscription so callers can remove it on unmount.
 */
export function addNotificationResponseRouter(
  navigate: (path: string) => void,
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as Partial<NotificationPayload>;
    if (data?.type) navigate(notificationRoute(data.type));
  });
}
