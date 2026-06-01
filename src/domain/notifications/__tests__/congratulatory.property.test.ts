// Feature: servicenow-cert-study-app, Property 22
//
// Property 22 — Congratulatory notification fires exactly on qualifying
// readiness-score increases: it fires when the score rises ≥10 points since the
// last congratulatory notification (or since enrollment if none) and at most
// once per 24 hours per exam.
//
// Validates: Requirements 8.3.

import fc from 'fast-check';
import {
  NotificationScheduler,
  CONGRATULATORY_COOLDOWN_MS,
  CONGRATULATORY_MIN_INCREASE,
} from '../NotificationScheduler';
import type { ScoreHistoryEntry } from '@domain/analytics';

/** Replays the history one entry at a time the way the live app would. */
function simulateFires(history: ScoreHistoryEntry[]): number[] {
  const fires: number[] = [];
  let lastNotifiedAt: number | null = null;
  for (let i = 0; i < history.length; i += 1) {
    const prefix = history.slice(0, i + 1);
    const now = history[i]!.recordedAt;
    if (NotificationScheduler.shouldSendCongratulatory(prefix, lastNotifiedAt, now)) {
      fires.push(i);
      lastNotifiedAt = now;
    }
  }
  return fires;
}

/** Independent expectation tracking baseline + cooldown explicitly. */
function expectedFires(history: ScoreHistoryEntry[]): number[] {
  if (history.length === 0) return [];
  const fires: number[] = [];
  let lastFireTime: number | null = null;
  let baseline = history[0]!.score; // since enrollment
  for (let i = 0; i < history.length; i += 1) {
    const cur = history[i]!.score;
    const t = history[i]!.recordedAt;
    const cooldownOk = lastFireTime === null || t - lastFireTime >= CONGRATULATORY_COOLDOWN_MS;
    if (cooldownOk && cur - baseline >= CONGRATULATORY_MIN_INCREASE) {
      fires.push(i);
      lastFireTime = t;
      baseline = cur; // baseline resets to the score at the notification
    }
  }
  return fires;
}

describe('NotificationScheduler.shouldSendCongratulatory — Property 22', () => {
  test('fires exactly on qualifying increases, capped at once per 24h', () => {
    const entryArb = fc.record({
      score: fc.integer({ min: 0, max: 100 }),
      gapHours: fc.integer({ min: 0, max: 48 }),
    });
    fc.assert(
      fc.property(fc.array(entryArb, { maxLength: 40 }), (raw) => {
        let t = 1_000_000;
        const history: ScoreHistoryEntry[] = raw.map((e) => {
          t += e.gapHours * 60 * 60 * 1000 + 1; // strictly increasing
          return { score: e.score, recordedAt: t };
        });

        const fires = simulateFires(history);
        const expected = expectedFires(history);

        // Every consecutive pair of fires is ≥24h apart (cooldown invariant).
        for (let k = 1; k < fires.length; k += 1) {
          const gap = history[fires[k]!]!.recordedAt - history[fires[k - 1]!]!.recordedAt;
          if (gap < CONGRATULATORY_COOLDOWN_MS) return false;
        }
        return JSON.stringify(fires) === JSON.stringify(expected);
      }),
      { numRuns: 300 },
    );
  });

  test('does not fire on an increase smaller than 10 points', () => {
    const history: ScoreHistoryEntry[] = [
      { score: 50, recordedAt: 1 },
      { score: 59, recordedAt: 2 },
    ];
    expect(NotificationScheduler.shouldSendCongratulatory(history, null, 2)).toBe(false);
  });

  test('fires on a ≥10-point gain since enrollment', () => {
    const history: ScoreHistoryEntry[] = [
      { score: 50, recordedAt: 1 },
      { score: 62, recordedAt: 2 },
    ];
    expect(NotificationScheduler.shouldSendCongratulatory(history, null, 2)).toBe(true);
  });

  test('respects the 24h cooldown even when the score keeps climbing', () => {
    const day = CONGRATULATORY_COOLDOWN_MS;
    const history: ScoreHistoryEntry[] = [
      { score: 50, recordedAt: 0 },
      { score: 70, recordedAt: day / 2 }, // last notified here
      { score: 90, recordedAt: day }, // only 12h later -> blocked
    ];
    expect(NotificationScheduler.shouldSendCongratulatory(history, day / 2, day)).toBe(false);
  });
});
