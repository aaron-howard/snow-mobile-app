/** Downloaded exam content is considered stale after 30 days (Requirement 9.8). */
export const CONTENT_STALE_AFTER_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Pure staleness check (Requirement 9.8): content is stale iff more than 30 days
 * have elapsed since it was downloaded. Exactly 30 days is **not** stale.
 */
export const ContentStalenessChecker = {
  isStale(downloadedAt: Date, today: Date): boolean {
    return today.getTime() - downloadedAt.getTime() > CONTENT_STALE_AFTER_MS;
  },
} as const;
