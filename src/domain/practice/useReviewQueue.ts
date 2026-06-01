import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { createRepositories } from '@db/repositories';
import type { QuestionRecord } from './types';

export interface UseReviewQueueResult {
  loading: boolean;
  error: string | null;
  /** Published questions answered incorrectly, ordered by descending incorrect count (Req 3.6). */
  questions: QuestionRecord[];
  refresh: () => Promise<void>;
}

/**
 * Loads the user's Review queue for an exam (Requirements 3.5, 3.6). Ordering by
 * descending incorrect count is enforced by the repository's `getReviewQueue`.
 */
export function useReviewQueue(examId: string | undefined): UseReviewQueueResult {
  const { userId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuestionRecord[]>([]);

  const refresh = useCallback(async () => {
    if (!examId) return;
    setLoading(true);
    setError(null);
    try {
      if (!userId) throw new Error('You must be signed in to view your Review queue.');
      const repos = createRepositories();
      setQuestions(await repos.questions.getReviewQueue(userId, examId));
    } catch {
      setError('Could not load your Review queue. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [examId, userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { loading, error, questions, refresh };
}
