import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { createRepositories } from '@db/repositories';
import type { NotificationSettingsDTO } from '@db/repositories/types';
import {
  ensureNotificationPermissions,
  getPermissionState,
  rescheduleDailyReminder,
  type PermissionState,
} from '@/notifications/notificationService';

export type NotificationSettingsPatch = Partial<Omit<NotificationSettingsDTO, 'userId'>>;

export interface UseNotificationSettingsResult {
  loading: boolean;
  error: string | null;
  settings: NotificationSettingsDTO | null;
  permission: PermissionState | null;
  update: (patch: NotificationSettingsPatch) => Promise<void>;
  requestPermission: () => Promise<void>;
}

function defaultSettings(userId: string): NotificationSettingsDTO {
  return {
    userId,
    dailyReminderEnabled: true,
    dailyReminderTime: '20:00',
    streakRiskEnabled: true,
    congratulatoryEnabled: true,
    readiness80Enabled: true,
    quietHoursStart: null,
    quietHoursEnd: null,
  };
}

/**
 * Loads and persists the user's notification preferences (Req 8.4) and keeps the
 * scheduled daily reminder in sync. Reads (but does not prompt for) the current
 * OS permission so the UI can surface a denied state (Req 8.5); `requestPermission`
 * triggers the actual prompt.
 */
export function useNotificationSettings(): UseNotificationSettingsResult {
  const repos = useMemo(() => createRepositories(), []);
  const { userId } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<NotificationSettingsDTO | null>(null);
  const [permission, setPermission] = useState<PermissionState | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        if (!userId) throw new Error('You must be signed in to manage notifications.');
        const existing = await repos.notificationSettings.get(userId);
        if (cancelled) return;
        setSettings(existing ?? defaultSettings(userId));
        try {
          const state = await getPermissionState();
          if (!cancelled) setPermission(state);
        } catch {
          // Permission read is best-effort (e.g. unavailable in a test env).
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load settings.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [repos, userId]);

  const update = useCallback(
    async (patch: NotificationSettingsPatch) => {
      if (!userId) return;
      const next: NotificationSettingsDTO = { ...(settings ?? defaultSettings(userId)), ...patch, userId };
      setSettings(next); // optimistic
      try {
        await repos.notificationSettings.upsert(next);
        await rescheduleDailyReminder(next);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to save settings.');
      }
    },
    [repos, settings, userId],
  );

  const requestPermission = useCallback(async () => {
    try {
      const state = await ensureNotificationPermissions();
      setPermission(state);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to request permission.');
    }
  }, []);

  return { loading, error, settings, permission, update, requestPermission };
}
