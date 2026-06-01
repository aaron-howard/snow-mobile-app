import { shouldSendReadiness80 } from '@domain/analytics';
import type { ScoreHistoryEntry } from '@domain/analytics';

/** Default local hour after which an unfulfilled streak is "at risk" (8 PM). */
export const STREAK_RISK_CUTOFF_HOUR = 20;
/** Congratulatory notifications require at least this much readiness gain. */
export const CONGRATULATORY_MIN_INCREASE = 10;
/** At most one congratulatory notification per exam per 24 hours. */
export const CONGRATULATORY_COOLDOWN_MS = 24 * 60 * 60 * 1000;

/** Parse "HH:MM" (24h) into minutes-of-day. Throws on malformed input. */
function parseTimeToMinutes(value: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) throw new Error(`NotificationScheduler: invalid time "${value}"`);
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) throw new Error(`NotificationScheduler: invalid time "${value}"`);
  return hours * 60 + minutes;
}

function minutesOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

function localDayNumber(date: Date): number {
  return Math.floor((date.getTime() - date.getTimezoneOffset() * 60000) / 86400000);
}

/** True when `m` (minutes-of-day) falls inside a quiet window that may wrap midnight. */
function isInWindow(m: number, startMin: number, endMin: number): boolean {
  if (startMin === endMin) return false; // empty window
  return startMin < endMin ? m >= startMin && m < endMin : m >= startMin || m < endMin;
}

/**
 * Pure scheduling decisions (Requirements 8.1–8.4, 6.6). No I/O — the
 * expo-notifications layer turns these into scheduled notifications.
 * `shouldSendReadiness80` is re-exported from the analytics domain so there is a
 * single source of truth (it was first implemented in task 9).
 */
export const NotificationScheduler = {
  /**
   * Next occurrence of the daily reminder time at or after `today` (Req 8.1).
   * If today's `HH:MM` has already passed, returns tomorrow's.
   */
  computeReminderFireTime(configuredTime: string, today: Date): Date {
    const target = parseTimeToMinutes(configuredTime);
    const fire = new Date(today);
    fire.setHours(Math.floor(target / 60), target % 60, 0, 0);
    if (fire.getTime() <= today.getTime()) {
      fire.setDate(fire.getDate() + 1);
    }
    return fire;
  },

  /**
   * If `scheduledTime` falls within quiet hours, move it to the first minute
   * after the window ends; otherwise return it unchanged (Req 8.4, Property 21).
   * The window may wrap midnight (e.g. 22:00–07:00).
   */
  rescheduleForQuietHours(scheduledTime: Date, quietStart: string, quietEnd: string): Date {
    const startMin = parseTimeToMinutes(quietStart);
    const endMin = parseTimeToMinutes(quietEnd);
    const m = minutesOfDay(scheduledTime);
    if (!isInWindow(m, startMin, endMin)) return scheduledTime;

    const end = new Date(scheduledTime);
    end.setHours(Math.floor(endMin / 60), endMin % 60, 0, 0);
    // For a wrapping window, the evening portion (m >= startMin) ends the next day.
    if (startMin > endMin && m >= startMin) {
      end.setDate(end.getDate() + 1);
    }
    return end;
  },

  /**
   * True when the streak is at risk (Req 8.2): it's at/after the cutoff hour, no
   * session has been completed today, yet the user studied yesterday (so there
   * is an active streak worth saving).
   */
  shouldSendStreakRisk(
    sessionDates: readonly Date[],
    today: Date,
    cutoffHour: number = STREAK_RISK_CUTOFF_HOUR,
  ): boolean {
    if (today.getHours() < cutoffHour) return false;
    const days = new Set(sessionDates.map(localDayNumber));
    const todayNum = localDayNumber(today);
    if (days.has(todayNum)) return false; // already studied today
    return days.has(todayNum - 1); // had a streak yesterday
  },

  /**
   * True when readiness rose ≥10 points since the last congratulatory
   * notification (or since enrollment if none) and the 24-hour cooldown has
   * elapsed (Req 8.3, Property 22). Epoch-ms timestamps.
   */
  shouldSendCongratulatory(
    scoreHistory: readonly ScoreHistoryEntry[],
    lastNotificationAt: number | null,
    now: number,
  ): boolean {
    if (scoreHistory.length === 0) return false;
    if (lastNotificationAt !== null && now - lastNotificationAt < CONGRATULATORY_COOLDOWN_MS) {
      return false;
    }

    const current = scoreHistory[scoreHistory.length - 1]!.score;

    let baseline: number;
    if (lastNotificationAt === null) {
      baseline = scoreHistory[0]!.score; // since enrollment
    } else {
      // Score as of the last congratulatory notification.
      const priorEntries = scoreHistory.filter((e) => e.recordedAt <= lastNotificationAt);
      baseline = priorEntries.length > 0 ? priorEntries[priorEntries.length - 1]!.score : scoreHistory[0]!.score;
    }

    return current - baseline >= CONGRATULATORY_MIN_INCREASE;
  },

  shouldSendReadiness80,
} as const;

export { shouldSendReadiness80 };
