// Feature: servicenow-cert-study-app, Property 24
//
// Property 24 — Stale content warning fires for content older than 30 days:
// `isStale` is true iff (today − downloadedAt) is strictly greater than 30 days.
// Content 30 days old or newer must not be flagged.
//
// Validates: Requirements 9.8.

import fc from 'fast-check';
import { ContentStalenessChecker, CONTENT_STALE_AFTER_MS } from '../ContentStalenessChecker';

const DAY = 24 * 60 * 60 * 1000;

describe('ContentStalenessChecker.isStale — Property 24', () => {
  test('stale iff more than 30 days have elapsed', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 4_102_444_800_000 }), // downloadedAt epoch ms (≤ year 2100)
        fc.integer({ min: -60 * DAY, max: 60 * DAY }), // elapsed delta
        (base, delta) => {
          const downloadedAt = new Date(base);
          const today = new Date(base + delta);
          const expected = delta > CONTENT_STALE_AFTER_MS;
          return ContentStalenessChecker.isStale(downloadedAt, today) === expected;
        },
      ),
      { numRuns: 300 },
    );
  });
});
