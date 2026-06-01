import { ContentStalenessChecker, CONTENT_STALE_AFTER_MS } from '../ContentStalenessChecker';

describe('ContentStalenessChecker.isStale', () => {
  const downloadedAt = new Date('2026-01-01T00:00:00Z');

  test('exactly 30 days old is not stale (boundary)', () => {
    const today = new Date(downloadedAt.getTime() + CONTENT_STALE_AFTER_MS);
    expect(ContentStalenessChecker.isStale(downloadedAt, today)).toBe(false);
  });

  test('30 days plus 1 ms is stale', () => {
    const today = new Date(downloadedAt.getTime() + CONTENT_STALE_AFTER_MS + 1);
    expect(ContentStalenessChecker.isStale(downloadedAt, today)).toBe(true);
  });

  test('fresh content is not stale', () => {
    const today = new Date(downloadedAt.getTime() + 5 * 24 * 60 * 60 * 1000);
    expect(ContentStalenessChecker.isStale(downloadedAt, today)).toBe(false);
  });

  test('a future download date is not stale', () => {
    const today = new Date(downloadedAt.getTime() - 1000);
    expect(ContentStalenessChecker.isStale(downloadedAt, today)).toBe(false);
  });
});
