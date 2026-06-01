import type { ScoreHistoryEntry } from './types';

/** Readiness score that recommends scheduling the official exam (Req 6.6). */
export const READINESS_TARGET = 80;

/**
 * Decide whether the readiness-80 notification should fire now (Requirement
 * 6.6, Property 16).
 *
 * Fires when the latest score is ≥ 80 and either (a) no readiness-80
 * notification has ever been sent (first time reaching 80), or (b) the score
 * dipped below 80 at some point after the last notification and has now reached
 * 80 again. It never fires twice for the same crossing (callers record
 * `lastNotifiedAt` after firing).
 */
export function shouldSendReadiness80(
  scoreHistory: readonly ScoreHistoryEntry[],
  lastNotifiedAt: number | null,
): boolean {
  if (scoreHistory.length === 0) return false;

  const current = scoreHistory[scoreHistory.length - 1]!.score;
  if (current < READINESS_TARGET) return false;

  if (lastNotifiedAt === null) return true;

  return scoreHistory.some(
    (entry) => entry.recordedAt > lastNotifiedAt && entry.score < READINESS_TARGET,
  );
}
