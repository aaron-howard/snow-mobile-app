import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { createRepositories } from '@db/repositories';
import { READINESS_WINDOW_MS, ReadinessScoreCalculator } from './ReadinessScoreCalculator';
import { StreakTracker } from './StreakTracker';
import type { StudySessionScore } from './types';

export interface HomeExamSummary {
  examId: string;
  name: string;
  /** Weighted readiness score over the last 30 days (Req 6.4). */
  readinessScore: number;
  /** Current consecutive-day study streak for this exam (Req 6.7). */
  currentStreak: number;
}

export interface UseHomeDashboardResult {
  loading: boolean;
  error: string | null;
  exams: HomeExamSummary[];
}

/**
 * Aggregates the home "active study list" (Requirements 2.3, 6.4, 6.7): every
 * enrolled exam with its weighted readiness score and current study streak.
 *
 * Readiness reuses the same per-domain-accuracy derivation as the progress
 * dashboard (`useProgress`) so the figures match across screens; the streak is
 * computed per-exam from that exam's completed quiz/simulator sessions.
 */
export function useHomeDashboard(): UseHomeDashboardResult {
  const repos = useMemo(() => createRepositories(), []);
  const { userId } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exams, setExams] = useState<HomeExamSummary[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        if (!userId) throw new Error('You must be signed in to view your study list.');
        const enrolled = await repos.exams.listEnrolled();
        const now = Date.now();
        const today = new Date(now);

        const summaries = await Promise.all(
          enrolled.map(async (exam): Promise<HomeExamSummary> => {
            const [domains, sessions, accuracyRecent] = await Promise.all([
              repos.topicDomains.listByExam(exam.id),
              repos.studySessions.listForUserExam(userId, exam.id),
              repos.attempts.accuracyByDomain(userId, exam.id, now - READINESS_WINDOW_MS),
            ]);

            const scores: StudySessionScore[] = accuracyRecent
              .filter((a) => a.total > 0)
              .map((a) => ({
                domainId: a.domainId,
                score: Math.round((a.correct / a.total) * 100),
                completedAt: now,
                sessionType: 'quiz' as const,
              }));
            const weights = domains.map((d) => ({
              domainId: d.id,
              weightPercent: d.weightPercent,
            }));
            const readinessScore = ReadinessScoreCalculator.calculate(scores, weights, now);

            const completedDates = sessions
              .filter((s) => s.completedAt !== null && s.sessionType !== 'flashcard')
              .map((s) => new Date(s.completedAt as number));
            const { current } = StreakTracker.compute(completedDates, today);

            return { examId: exam.id, name: exam.name, readinessScore, currentStreak: current };
          }),
        );

        if (!cancelled) setExams(summaries);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load your study list.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [repos, userId]);

  return { loading, error, exams };
}
