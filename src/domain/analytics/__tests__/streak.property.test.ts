// Feature: servicenow-cert-study-app, Property 17
//
// Property 17 — Streak increments exactly once per calendar day with a session
// and resets on a missed day.
//
// Validates: Requirements 6.7.

import fc from 'fast-check';
import { StreakTracker } from '../StreakTracker';

const DAY_MS = 86400000;

function localDayNumber(date: Date): number {
  return Math.floor((date.getTime() - date.getTimezoneOffset() * 60000) / DAY_MS);
}

/** Independent reference implementation of the streak semantics. */
function expectedStreak(dates: Date[], today: Date): { current: number; longest: number } {
  const days = new Set(dates.map(localDayNumber));
  if (days.size === 0) return { current: 0, longest: 0 };
  const sorted = [...days].sort((a, b) => a - b);

  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i += 1) {
    run = sorted[i] === sorted[i - 1]! + 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }

  const todayNum = localDayNumber(today);
  let anchor: number | null = days.has(todayNum)
    ? todayNum
    : days.has(todayNum - 1)
      ? todayNum - 1
      : null;
  let current = 0;
  while (anchor !== null && days.has(anchor)) {
    current += 1;
    anchor -= 1;
  }
  return { current, longest };
}

describe('StreakTracker.compute — Property 17', () => {
  test('matches the expected calendar-day streak for any session dates', () => {
    const today = new Date('2026-05-31T12:00:00');
    const dateArb = fc
      .integer({ min: -40, max: 0 })
      .map((offsetDays) => new Date(today.getTime() + offsetDays * DAY_MS));

    fc.assert(
      fc.property(fc.array(dateArb, { maxLength: 60 }), (dates) => {
        const result = StreakTracker.compute(dates, today);
        const expected = expectedStreak(dates, today);
        return result.current === expected.current && result.longest === expected.longest;
      }),
      { numRuns: 300 },
    );
  });

  test('resets the current streak when a day is missed', () => {
    const today = new Date('2026-05-31T09:00:00');
    const twoDaysAgo = new Date(today.getTime() - 2 * DAY_MS);
    const threeDaysAgo = new Date(today.getTime() - 3 * DAY_MS);
    // Sessions two and three days ago, but nothing today or yesterday -> current 0.
    const result = StreakTracker.compute([twoDaysAgo, threeDaysAgo], today);
    expect(result.current).toBe(0);
    expect(result.longest).toBe(2);
  });

  test('counts consecutive days ending today', () => {
    const today = new Date('2026-05-31T09:00:00');
    const dates = [0, 1, 2].map((n) => new Date(today.getTime() - n * DAY_MS));
    expect(StreakTracker.compute(dates, today)).toEqual({ current: 3, longest: 3 });
  });
});
