// Feature: servicenow-cert-study-app, Property 16
//
// Property 16 — Readiness-80 notification fires exactly at qualifying score
// transitions: the first time the score reaches 80, or when it reaches 80 again
// after dropping below 80 since the last notification; never more than once per
// qualifying crossing.
//
// Validates: Requirements 6.6.

import fc from 'fast-check';
import { shouldSendReadiness80 } from '../readinessNotifications';
import type { ScoreHistoryEntry } from '../types';

/**
 * Replays the score history one entry at a time the way a live app would,
 * recording the index of every entry at which the notification fires.
 */
function simulateFires(history: ScoreHistoryEntry[]): number[] {
  const fires: number[] = [];
  let lastNotifiedAt: number | null = null;
  for (let i = 0; i < history.length; i += 1) {
    const prefix = history.slice(0, i + 1);
    if (shouldSendReadiness80(prefix, lastNotifiedAt)) {
      fires.push(i);
      lastNotifiedAt = history[i]!.recordedAt;
    }
  }
  return fires;
}

/** Independent expectation: indices where a qualifying crossing occurs. */
function expectedFires(history: ScoreHistoryEntry[]): number[] {
  const fires: number[] = [];
  let armed = true; // ready to fire on the next >=80
  for (let i = 0; i < history.length; i += 1) {
    const score = history[i]!.score;
    if (score >= 80) {
      if (armed) {
        fires.push(i);
        armed = false;
      }
    } else {
      armed = true; // dropped below 80 -> re-arm for the next crossing
    }
  }
  return fires;
}

describe('shouldSendReadiness80 — Property 16', () => {
  test('fires exactly at qualifying 80-crossings', () => {
    const entryArb = fc.record({
      score: fc.integer({ min: 0, max: 100 }),
    });
    fc.assert(
      fc.property(fc.array(entryArb, { maxLength: 40 }), (raw) => {
        // Assign strictly increasing timestamps.
        const history: ScoreHistoryEntry[] = raw.map((e, i) => ({
          score: e.score,
          recordedAt: 1000 + i,
        }));
        const fires = simulateFires(history);
        const expected = expectedFires(history);
        return JSON.stringify(fires) === JSON.stringify(expected);
      }),
      { numRuns: 300 },
    );
  });

  test('does not re-send while the score stays at or above 80', () => {
    const history: ScoreHistoryEntry[] = [
      { score: 82, recordedAt: 1 },
      { score: 90, recordedAt: 2 },
    ];
    expect(shouldSendReadiness80([history[0]!], null)).toBe(true);
    // Already notified at t=1, no dip -> no resend.
    expect(shouldSendReadiness80(history, 1)).toBe(false);
  });

  test('re-sends after dropping below 80 and recovering', () => {
    const history: ScoreHistoryEntry[] = [
      { score: 81, recordedAt: 1 },
      { score: 70, recordedAt: 2 },
      { score: 85, recordedAt: 3 },
    ];
    expect(shouldSendReadiness80(history, 1)).toBe(true);
  });

  test('never fires below 80', () => {
    expect(shouldSendReadiness80([{ score: 79, recordedAt: 1 }], null)).toBe(false);
  });
});
