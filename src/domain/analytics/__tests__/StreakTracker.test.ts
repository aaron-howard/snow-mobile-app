import { StreakTracker } from '../StreakTracker';

const DAY_MS = 86400000;

describe('StreakTracker.compute', () => {
  const today = new Date('2026-05-31T10:00:00');

  test('returns zeros with no sessions', () => {
    expect(StreakTracker.compute([], today)).toEqual({ current: 0, longest: 0 });
  });

  test('counts multiple sessions on the same day once', () => {
    const dates = [
      new Date('2026-05-31T08:00:00'),
      new Date('2026-05-31T20:00:00'),
    ];
    expect(StreakTracker.compute(dates, today)).toEqual({ current: 1, longest: 1 });
  });

  test('keeps the current streak alive when only yesterday has a session', () => {
    const yesterday = new Date(today.getTime() - DAY_MS);
    const dayBefore = new Date(today.getTime() - 2 * DAY_MS);
    expect(StreakTracker.compute([yesterday, dayBefore], today)).toEqual({
      current: 2,
      longest: 2,
    });
  });

  test('tracks the longest streak independently of the current streak', () => {
    // A 4-day run a while ago, then a gap, then a 1-day current streak.
    const longRun = [10, 11, 12, 13].map((n) => new Date(today.getTime() - n * DAY_MS));
    const recent = [new Date(today.getTime())];
    const result = StreakTracker.compute([...longRun, ...recent], today);
    expect(result.current).toBe(1);
    expect(result.longest).toBe(4);
  });
});
