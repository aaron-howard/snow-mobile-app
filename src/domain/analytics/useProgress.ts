import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { createRepositories } from '@db/repositories';
import { READINESS_WINDOW_MS, ReadinessScoreCalculator } from './ReadinessScoreCalculator';
import { shouldSendReadiness80 } from './readinessNotifications';
import type { StudySessionScore } from './types';

export interface DomainAccuracyRow {
  domainId: string;
  name: string;
  correct: number;
  total: number;
}

export interface UseProgressResult {
  loading: boolean;
  error: string | null;
  /** False when no quiz/simulator session data exists yet (Req 6.9). */
  hasData: boolean;
  readinessScore: number;
  domainAccuracy: DomainAccuracyRow[];
  studyDays: Date[];
  /** True when the readiness-80 recommendation should be shown (Req 6.6). */
  showReadiness80: boolean;
  dismissReadiness80: () => void;
}

/**
 * Assembles the per-exam progress dashboard (Requirements 6.2–6.6, 6.9):
 * per-domain accuracy, study-activity days, a weighted readiness score over the
 * last 30 days, and the readiness-80 recommendation trigger.
 *
 * Readiness is derived from per-domain accuracy in the last 30 days (one scored
 * "session" per domain) because `study_sessions` records an overall score
 * without a domain breakdown; this keeps the pure calculator faithful to the
 * design while feeding it real data. Full readiness-80 crossing detection lives
 * in the NotificationScheduler (task 12); here the trigger uses the current
 * score plus the last-sent timestamp, so it shows once and stays dismissed.
 */
export function useProgress(examId: string | undefined): UseProgressResult {
  const repos = useMemo(() => createRepositories(), []);
  const { userId } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasData, setHasData] = useState(false);
  const [readinessScore, setReadinessScore] = useState(0);
  const [domainAccuracy, setDomainAccuracy] = useState<DomainAccuracyRow[]>([]);
  const [studyDays, setStudyDays] = useState<Date[]>([]);
  const [showReadiness80, setShowReadiness80] = useState(false);

  useEffect(() => {
    if (!examId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        if (!userId) throw new Error('You must be signed in to view progress.');
        const now = Date.now();
        const [domains, sessions, accuracyAll, accuracyRecent, lastNotif] = await Promise.all([
          repos.topicDomains.listByExam(examId),
          repos.studySessions.listForUserExam(userId, examId),
          repos.attempts.accuracyByDomain(userId, examId),
          repos.attempts.accuracyByDomain(userId, examId, now - READINESS_WINDOW_MS),
          repos.readinessScoreNotifications.getLast(userId, examId, 'readiness_80'),
        ]);
        if (cancelled) return;

        const completed = sessions.filter(
          (s) => s.completedAt !== null && s.sessionType !== 'flashcard',
        );

        const accByDomain = new Map(accuracyAll.map((a) => [a.domainId, a]));
        const rows: DomainAccuracyRow[] = domains.map((d) => {
          const tally = accByDomain.get(d.id);
          return { domainId: d.id, name: d.name, correct: tally?.correct ?? 0, total: tally?.total ?? 0 };
        });

        const scores: StudySessionScore[] = accuracyRecent
          .filter((a) => a.total > 0)
          .map((a) => ({
            domainId: a.domainId,
            score: Math.round((a.correct / a.total) * 100),
            completedAt: now,
            sessionType: 'quiz' as const,
          }));
        const weights = domains.map((d) => ({ domainId: d.id, weightPercent: d.weightPercent }));
        const readiness = ReadinessScoreCalculator.calculate(scores, weights, now);

        setReadinessScore(readiness);
        setDomainAccuracy(rows);
        setStudyDays(completed.map((s) => new Date(s.completedAt as number)));
        setHasData(completed.length > 0);
        setShowReadiness80(
          shouldSendReadiness80([{ score: readiness, recordedAt: now }], lastNotif?.sentAt ?? null),
        );
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load progress.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [examId, userId, repos]);

  const dismissReadiness80 = useCallback(() => {
    setShowReadiness80(false);
    if (!userId || !examId) return;
    void repos.readinessScoreNotifications
      .create({
        userId,
        examId,
        notificationType: 'readiness_80',
        scoreAtNotification: readinessScore,
        sentAt: Date.now(),
      })
      .catch(() => {
        /* best-effort; dismissal already hides the banner for this view */
      });
  }, [userId, examId, repos, readinessScore]);

  return {
    loading,
    error,
    hasData,
    readinessScore,
    domainAccuracy,
    studyDays,
    showReadiness80,
    dismissReadiness80,
  };
}
