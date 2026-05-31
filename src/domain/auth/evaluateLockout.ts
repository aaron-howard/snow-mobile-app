import type { LockoutOptions, LockoutResult } from './types';

/**
 * Account-lockout evaluator per Requirements 1.9 and 1.10:
 *
 *   "IF a user's failed-attempt counter reaches 5 within a 10-minute
 *    window, THEN THE App SHALL lock the account for 15 minutes…"
 *
 * Given a list of failed-login attempt timestamps and a rolling window,
 * return `{ locked: true, lockedUntil }` iff some 10-minute window
 * contains ≥5 attempts. The lock starts at the 5th attempt in that
 * window and lasts `lockDurationMs`.
 *
 * Pure function (no DB, no clock). The caller decides whether the
 * lockedUntil time is still in the future relative to `now`.
 *
 * Validates: Property 2.
 *
 * Algorithm: sort attempts ascending, then scan with a 5-element sliding
 * window. The first window of 5 attempts that fits in `windowMs` is the
 * trigger; we use the timestamp of the *last* (5th) attempt as the lock
 * anchor — that's the moment the lockout becomes effective.
 *
 * Complexity: O(n log n) for the sort, O(n) for the scan.
 */
export const DEFAULT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
export const DEFAULT_LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes
export const FAILED_ATTEMPTS_THRESHOLD = 5;

export function evaluateLockout(
  attempts: Date[],
  options: LockoutOptions = {
    windowMs: DEFAULT_WINDOW_MS,
    lockDurationMs: DEFAULT_LOCK_DURATION_MS,
  },
): LockoutResult {
  if (attempts.length < FAILED_ATTEMPTS_THRESHOLD) {
    return { locked: false, lockedUntil: null };
  }

  // Defensive copy + sort ascending. We index into the sorted array below,
  // so we copy first to avoid mutating the caller's data.
  const sortedMs = attempts.map((d) => d.getTime()).sort((a, b) => a - b);

  // Sliding window of size FAILED_ATTEMPTS_THRESHOLD. For each starting
  // index i, the window spans [i, i + 4]. If the 5th element is within
  // windowMs of the 1st, the threshold is met.
  const lastIndex = sortedMs.length - FAILED_ATTEMPTS_THRESHOLD;
  for (let i = 0; i <= lastIndex; i++) {
    const first = sortedMs[i];
    const fifth = sortedMs[i + FAILED_ATTEMPTS_THRESHOLD - 1];
    // Defensive: `noUncheckedIndexedAccess` makes these `number | undefined`.
    if (first === undefined || fifth === undefined) continue;
    if (fifth - first <= options.windowMs) {
      return {
        locked: true,
        lockedUntil: new Date(fifth + options.lockDurationMs),
      };
    }
  }

  return { locked: false, lockedUntil: null };
}
