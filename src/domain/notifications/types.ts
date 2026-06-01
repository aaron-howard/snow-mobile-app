/** The four notification categories the app schedules (Requirements 8.1–8.3, 6.6). */
export type NotificationType =
  | 'daily_reminder'
  | 'streak_risk'
  | 'congratulatory'
  | 'readiness_80';

/** Data attached to a scheduled notification so taps can be routed (Req 8.6). */
export interface NotificationPayload {
  type: NotificationType;
  /** Exam the notification relates to, when applicable. */
  examId?: string;
}

/**
 * Map a notification type to the Expo Router path its tap should open (Req 8.6):
 * daily reminder → home, streak-risk → active study list (home), congratulatory
 * and readiness-80 → progress dashboard. Pure and exhaustively typed.
 */
export function notificationRoute(type: NotificationType): string {
  switch (type) {
    case 'daily_reminder':
    case 'streak_risk':
      return '/(tabs)';
    case 'congratulatory':
    case 'readiness_80':
      return '/(tabs)/progress';
    default: {
      const exhaustive: never = type;
      return exhaustive;
    }
  }
}
