import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { createRepositories } from '@db/repositories';
import { loadDomainSelections } from '@domain/catalog/domainSelectionStorage';
import { QuizSessionManager } from './QuizSessionManager';
import type { AnswerResult, QuizSession, SessionSummary } from './types';

export type QuizMode = 'standard' | 'bookmark';

export interface UseQuizResult {
  loading: boolean;
  error: string | null;
  session: QuizSession | null;
  currentIndex: number;
  /** Grading result for the current question, or null until answered. */
  result: AnswerResult | null;
  selectedAnswerId: string | null;
  submitting: boolean;
  isLastQuestion: boolean;
  summary: SessionSummary | null;
  select: (answerId: string) => Promise<void>;
  next: () => void;
  finish: () => Promise<void>;
}

/**
 * Drives a practice-quiz screen: wires {@link QuizSessionManager} to the local
 * repositories and the signed-in user, then exposes one-question-at-a-time
 * navigation, ≤500 ms answer feedback, and the end-of-session summary.
 */
export function useQuiz(examId: string | undefined, mode: QuizMode = 'standard'): UseQuizResult {
  const { userId } = useAuth();
  const managerRef = useRef<QuizSessionManager | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<QuizSession | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [selectedAnswerId, setSelectedAnswerId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [summary, setSummary] = useState<SessionSummary | null>(null);

  useEffect(() => {
    if (!examId) return;
    let cancelled = false;

    void (async () => {
      setLoading(true);
      setError(null);
      try {
        if (!userId) throw new Error('You must be signed in to start a quiz.');
        const repos = createRepositories();
        const manager = new QuizSessionManager({
          questions: repos.questions,
          answerChoices: repos.answerChoices,
          studySessions: repos.studySessions,
          attempts: repos.attempts,
          bookmarks: repos.bookmarks,
          userId,
        });
        managerRef.current = manager;

        const started =
          mode === 'bookmark'
            ? await manager.startBookmarkSession(examId)
            : await manager.startSession(examId, await resolveDomainFilter(examId));

        if (!cancelled) setSession(started);
      } catch {
        if (!cancelled) setError('Could not start the quiz. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [examId, mode, userId]);

  const isLastQuestion = session !== null && currentIndex >= session.questions.length - 1;

  const select = useCallback(
    async (answerId: string) => {
      const manager = managerRef.current;
      const current = session?.questions[currentIndex];
      if (!manager || !session || !current || result !== null || submitting) return;

      setSubmitting(true);
      setSelectedAnswerId(answerId);
      try {
        const graded = await manager.submitAnswer(session.sessionId, current.question.id, answerId);
        setResult(graded);
      } catch {
        setSelectedAnswerId(null);
        setError('Could not record your answer. Please try again.');
      } finally {
        setSubmitting(false);
      }
    },
    [session, currentIndex, result, submitting],
  );

  const next = useCallback(() => {
    setResult(null);
    setSelectedAnswerId(null);
    setCurrentIndex((i) => i + 1);
  }, []);

  const finish = useCallback(async () => {
    const manager = managerRef.current;
    if (!manager || !session) return;
    try {
      const result_ = await manager.endSession(session.sessionId);
      setSummary(result_);
    } catch {
      setError('Could not save your session summary.');
    }
  }, [session]);

  return {
    loading,
    error,
    session,
    currentIndex,
    result,
    selectedAnswerId,
    submitting,
    isLastQuestion,
    summary,
    select,
    next,
    finish,
  };
}

async function resolveDomainFilter(examId: string): Promise<string | undefined> {
  try {
    const selections = await loadDomainSelections();
    return selections[examId] ?? undefined;
  } catch {
    return undefined;
  }
}
