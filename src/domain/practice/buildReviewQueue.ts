/** Minimal shape the Review queue needs: a question id and its incorrect-answer count. */
export interface ReviewQueueCandidate {
  questionId: string;
  incorrectCount: number;
}

/**
 * Build the Review queue (Requirements 3.5, 3.6).
 *
 * Includes every question the user has answered incorrectly at least once and
 * excludes questions answered only correctly (`incorrectCount === 0`). The
 * result is ordered by descending incorrect-answer count so the weakest areas
 * surface first. Ties preserve input order (stable sort).
 *
 * Generic over the candidate shape so callers can pass richer question records;
 * only `incorrectCount` is required.
 */
export function buildReviewQueue<T extends ReviewQueueCandidate>(candidates: readonly T[]): T[] {
  return candidates
    .filter((c) => c.incorrectCount > 0)
    .sort((a, b) => b.incorrectCount - a.incorrectCount);
}
