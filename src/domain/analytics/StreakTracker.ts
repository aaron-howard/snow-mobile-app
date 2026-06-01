import type { StreakResult } from './types';

/** Local-timezone calendar-day index for a date (days since the local epoch). */
function localDayNumber(date: Date): number {
  return Math.floor((date.getTime() - date.getTimezoneOffset() * 60000) / 86400000);
}

/**
 * Pure streak computation (Requirement 6.7, Property 17).
 *
 * Counts distinct local calendar days on which a session was completed. The
 * current streak is the run of consecutive days ending today (or yesterday, if
 * today has no session yet — the day hasn't been "missed" until it passes); a
 * gap resets it. The longest streak is the longest consecutive run anywhere.
 */
export const StreakTracker = {
  compute(sessionDates: readonly Date[], today: Date): StreakResult {
    const days = new Set<number>();
    for (const date of sessionDates) days.add(localDayNumber(date));
    if (days.size === 0) return { current: 0, longest: 0 };

    const sorted = Array.from(days).sort((a, b) => a - b);

    let longest = 1;
    let run = 1;
    for (let i = 1; i < sorted.length; i += 1) {
      run = sorted[i] === sorted[i - 1]! + 1 ? run + 1 : 1;
      if (run > longest) longest = run;
    }

    const todayNum = localDayNumber(today);
    let anchor: number | null = null;
    if (days.has(todayNum)) anchor = todayNum;
    else if (days.has(todayNum - 1)) anchor = todayNum - 1;

    let current = 0;
    if (anchor !== null) {
      let day = anchor;
      while (days.has(day)) {
        current += 1;
        day -= 1;
      }
    }

    return { current, longest };
  },
} as const;
