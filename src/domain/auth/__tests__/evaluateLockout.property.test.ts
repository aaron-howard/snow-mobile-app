// Feature: servicenow-cert-study-app, Property 2
//
// Property 2 — Account lockout triggers at exactly 5 failed attempts within the window.
//
// For any sequence of failed login attempt timestamps, if 5 or more
// attempts fall within any rolling 10-minute window, the lockout
// evaluator SHALL return a locked state; if fewer than 5 attempts fall
// within any 10-minute window, it SHALL return an unlocked state.
//
// Validates: Requirements 1.9, 1.10.

import fc from 'fast-check';
import {
  DEFAULT_LOCK_DURATION_MS,
  DEFAULT_WINDOW_MS,
  FAILED_ATTEMPTS_THRESHOLD,
  evaluateLockout,
} from '../evaluateLockout';

/**
 * Independent oracle: for the given attempts and window, is there any
 * 5-element subsequence (in time order) that fits inside `windowMs`?
 *
 * Implementation deliberately different in shape from `evaluateLockout`
 * (full sort + nested check, no sliding-window optimisation) so that a
 * bug in either side has somewhere to be caught.
 */
function expectedLocked(attempts: Date[], windowMs: number): boolean {
  const sortedMs = attempts.map((d) => d.getTime()).sort((a, b) => a - b);
  for (let i = 0; i < sortedMs.length; i++) {
    const start = sortedMs[i];
    if (start === undefined) continue;
    let count = 0;
    for (let j = i; j < sortedMs.length; j++) {
      const t = sortedMs[j];
      if (t === undefined) continue;
      if (t - start <= windowMs) count++;
      else break;
    }
    if (count >= FAILED_ATTEMPTS_THRESHOLD) return true;
  }
  return false;
}

describe('evaluateLockout — Property 2', () => {
  test('locked iff ≥5 attempts fall within any rolling 10-minute window', () => {
    fc.assert(
      fc.property(
        // Up to 20 attempts at any time within a ~30-day span. Big enough
        // to exercise the boundary; small enough to keep the test fast.
        fc.array(
          fc
            .integer({ min: 0, max: 30 * 24 * 60 * 60 * 1000 })
            .map((ms) => new Date(ms)),
          { maxLength: 20 },
        ),
        (attempts) => {
          const result = evaluateLockout(attempts, {
            windowMs: DEFAULT_WINDOW_MS,
            lockDurationMs: DEFAULT_LOCK_DURATION_MS,
          });
          return result.locked === expectedLocked(attempts, DEFAULT_WINDOW_MS);
        },
      ),
      { numRuns: 200 },
    );
  });

  // --- Explicit fixtures for the most common boundary cases ----------

  test('returns unlocked for fewer than 5 attempts', () => {
    const t = new Date('2026-06-01T12:00:00Z');
    expect(evaluateLockout([t, t, t, t]).locked).toBe(false);
  });

  test('returns locked at exactly 5 attempts within 10 minutes', () => {
    const t0 = new Date('2026-06-01T12:00:00Z').getTime();
    const attempts = [
      new Date(t0),
      new Date(t0 + 60_000),
      new Date(t0 + 2 * 60_000),
      new Date(t0 + 3 * 60_000),
      new Date(t0 + 5 * 60_000), // 5th attempt, still within 10 min
    ];
    const result = evaluateLockout(attempts);
    expect(result.locked).toBe(true);
    // Lock anchor is the 5th attempt; lockedUntil = anchor + 15 min.
    expect(result.lockedUntil?.getTime()).toBe(
      attempts[4]!.getTime() + DEFAULT_LOCK_DURATION_MS,
    );
  });

  test('returns unlocked when 5 attempts span just over 10 minutes', () => {
    const t0 = new Date('2026-06-01T12:00:00Z').getTime();
    const attempts = [
      new Date(t0),
      new Date(t0 + 3 * 60_000),
      new Date(t0 + 5 * 60_000),
      new Date(t0 + 7 * 60_000),
      new Date(t0 + 10 * 60_000 + 1), // 1 ms over the window
    ];
    expect(evaluateLockout(attempts).locked).toBe(false);
  });

  test('detects a qualifying window even when earlier attempts are far apart', () => {
    const t0 = new Date('2026-06-01T12:00:00Z').getTime();
    const attempts = [
      // Two stray attempts far in the past — should not trigger on their own.
      new Date(t0),
      new Date(t0 + 60 * 60_000),
      // Five attempts in a tight cluster two hours later — should trigger.
      new Date(t0 + 120 * 60_000),
      new Date(t0 + 121 * 60_000),
      new Date(t0 + 122 * 60_000),
      new Date(t0 + 123 * 60_000),
      new Date(t0 + 124 * 60_000),
    ];
    expect(evaluateLockout(attempts).locked).toBe(true);
  });

  test('handles unsorted input correctly', () => {
    const t0 = new Date('2026-06-01T12:00:00Z').getTime();
    const sorted = [
      new Date(t0),
      new Date(t0 + 60_000),
      new Date(t0 + 2 * 60_000),
      new Date(t0 + 3 * 60_000),
      new Date(t0 + 4 * 60_000),
    ];
    // Same dates, but shuffled — evaluator must sort.
    const unsorted = [sorted[3], sorted[0], sorted[4], sorted[2], sorted[1]] as Date[];
    expect(evaluateLockout(unsorted).locked).toBe(true);
  });
});
