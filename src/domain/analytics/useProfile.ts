import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { createRepositories } from '@db/repositories';
import { StreakTracker } from './StreakTracker';

export interface UseProfileResult {
  loading: boolean;
  error: string | null;
  currentStreak: number;
  longestStreak: number;
  totalQuestionsAnswered: number;
  totalStudySessions: number;
}

/**
 * Aggregates profile statistics across all enrolled exams (Requirement 6.8):
 * current/longest study streak, total questions answered, and total completed
 * study sessions. Computed from `study_sessions` so the figures stay accurate
 * without relying on separately-maintained counters.
 */
export function useProfile(): UseProfileResult {
  const repos = useMemo(() => createRepositories(), []);
  const { userId } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [totalQuestionsAnswered, setTotalQuestionsAnswered] = useState(0);
  const [totalStudySessions, setTotalStudySessions] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        if (!userId) throw new Error('You must be signed in to view your profile.');
        const exams = await repos.exams.listEnrolled();
        const perExam = await Promise.all(
          exams.map((exam) => repos.studySessions.listForUserExam(userId, exam.id)),
        );
        if (cancelled) return;

        const completed = perExam
          .flat()
          .filter((s) => s.completedAt !== null && s.sessionType !== 'flashcard');

        const dates = completed.map((s) => new Date(s.completedAt as number));
        const streak = StreakTracker.compute(dates, new Date());

        setCurrentStreak(streak.current);
        setLongestStreak(streak.longest);
        setTotalStudySessions(completed.length);
        setTotalQuestionsAnswered(completed.reduce((sum, s) => sum + s.totalQuestions, 0));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load profile.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [repos, userId]);

  return {
    loading,
    error,
    currentStreak,
    longestStreak,
    totalQuestionsAnswered,
    totalStudySessions,
  };
}
