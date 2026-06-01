// Feature: servicenow-cert-study-app, Property 21
//
// Property 21 — Notification quiet-hours rescheduling never fires during quiet
// hours: any notification whose scheduled time falls inside the quiet window is
// moved to the first minute after the window ends, and is never returned inside
// the window.
//
// Validates: Requirements 8.4.

import fc from 'fast-check';
import { NotificationScheduler } from '../NotificationScheduler';

const BASE = new Date(2026, 5, 1, 0, 0, 0, 0); // local 2026-06-01 00:00

function fmt(minutesOfDay: number): string {
  const h = Math.floor(minutesOfDay / 60);
  const m = minutesOfDay % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function inWindow(m: number, start: number, end: number): boolean {
  if (start === end) return false;
  return start < end ? m >= start && m < end : m >= start || m < end;
}

describe('NotificationScheduler.rescheduleForQuietHours — Property 21', () => {
  test('a time inside quiet hours is moved to quiet-end and out of the window', () => {
    const arb = fc.record({
      startMin: fc.integer({ min: 0, max: 1439 }),
      // Quiet window must be 1..720 minutes (≤ 12 consecutive hours, Req 8.4).
      durationMin: fc.integer({ min: 1, max: 720 }),
      // Offset of the scheduled time within the window.
      offset: fc.integer({ min: 0, max: 719 }),
    });

    fc.assert(
      fc.property(arb, ({ startMin, durationMin, offset }) => {
        const endMin = (startMin + durationMin) % 1440;
        const off = offset % durationMin;
        const scheduledMin = (startMin + off) % 1440;

        const scheduled = new Date(BASE);
        scheduled.setHours(Math.floor(scheduledMin / 60), scheduledMin % 60, 0, 0);

        const result = NotificationScheduler.rescheduleForQuietHours(
          scheduled,
          fmt(startMin),
          fmt(endMin),
        );

        const resultMin = result.getHours() * 60 + result.getMinutes();
        // Lands exactly on quiet-end, never inside the window, and never earlier.
        return (
          resultMin === endMin &&
          !inWindow(resultMin, startMin, endMin) &&
          result.getTime() >= scheduled.getTime()
        );
      }),
      { numRuns: 300 },
    );
  });

  test('a time outside quiet hours is returned unchanged', () => {
    const arb = fc.record({
      startMin: fc.integer({ min: 0, max: 1439 }),
      durationMin: fc.integer({ min: 1, max: 720 }),
      scheduledMin: fc.integer({ min: 0, max: 1439 }),
    });

    fc.assert(
      fc.property(arb, ({ startMin, durationMin, scheduledMin }) => {
        const endMin = (startMin + durationMin) % 1440;
        fc.pre(!inWindow(scheduledMin, startMin, endMin));

        const scheduled = new Date(BASE);
        scheduled.setHours(Math.floor(scheduledMin / 60), scheduledMin % 60, 0, 0);

        const result = NotificationScheduler.rescheduleForQuietHours(
          scheduled,
          fmt(startMin),
          fmt(endMin),
        );
        return result.getTime() === scheduled.getTime();
      }),
      { numRuns: 300 },
    );
  });
});
