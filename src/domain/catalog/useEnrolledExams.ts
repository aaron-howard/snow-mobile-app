import { useEffect, useMemo, useState } from 'react';
import { createRepositories } from '@db/repositories';
import type { ExamDTO } from '@db/repositories/types';

export interface UseEnrolledExamsResult {
  loading: boolean;
  error: string | null;
  exams: ExamDTO[];
}

/** Loads the user's enrolled exams for screens that need an exam picker
 * (progress dashboard, profile). Read-only; no network refresh. */
export function useEnrolledExams(): UseEnrolledExamsResult {
  const repos = useMemo(() => createRepositories(), []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exams, setExams] = useState<ExamDTO[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const enrolled = await repos.exams.listEnrolled();
        if (!cancelled) setExams(enrolled);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load exams.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [repos]);

  return { loading, error, exams };
}
