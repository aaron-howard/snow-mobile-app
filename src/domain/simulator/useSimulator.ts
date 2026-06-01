import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import { createRepositories } from '@db/repositories';
import { buildConfirmationSummary } from './buildConfirmationSummary';
import { ExamSimulatorController, SimulatorRestoreError } from './ExamSimulatorController';
import type { ConfirmationSummary, SimulatorResult, SimulatorSession } from './types';

export type SimulatorPhase =
  | 'loading'
  | 'idle'
  | 'active'
  | 'submitting'
  | 'result'
  | 'restore_error';

export interface UseSimulatorResult {
  phase: SimulatorPhase;
  error: string | null;
  session: SimulatorSession | null;
  currentIndex: number;
  remainingSeconds: number;
  paused: boolean;
  /** Non-null while the pre-submission confirmation dialog is open (Req 5.5). */
  confirmation: ConfirmationSummary | null;
  result: SimulatorResult | null;
  start: () => Promise<void>;
  select: (questionId: string, answerId: string) => Promise<void>;
  toggleFlag: (questionId: string) => Promise<void>;
  goTo: (index: number) => void;
  goNext: () => void;
  goPrev: () => void;
  requestSubmit: () => void;
  cancelSubmit: () => void;
  confirmSubmit: () => Promise<void>;
  restart: () => Promise<void>;
  discard: () => Promise<void>;
}

export function useSimulator(examId: string | undefined): UseSimulatorResult {
  const { userId } = useAuth();

  const controller = useMemo(() => {
    const repos = createRepositories();
    return new ExamSimulatorController({
      exams: repos.exams,
      questions: repos.questions,
      answerChoices: repos.answerChoices,
      simulatorSessions: repos.simulatorSessions,
      studySessions: repos.studySessions,
      userId: userId ?? 'anonymous',
    });
  }, [userId]);

  const [phase, setPhase] = useState<SimulatorPhase>('loading');
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<SimulatorSession | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [paused, setPaused] = useState(false);
  const [confirmation, setConfirmation] = useState<ConfirmationSummary | null>(null);
  const [result, setResult] = useState<SimulatorResult | null>(null);

  const sessionRef = useRef<SimulatorSession | null>(null);
  const remainingRef = useRef(0);
  const submittingRef = useRef(false);
  const staleDiscardId = useRef<string | null>(null);

  sessionRef.current = session;
  remainingRef.current = remainingSeconds;

  // Attempt to resume an in-flight session on mount (Req 5.8/5.9).
  useEffect(() => {
    if (!examId) return;
    let cancelled = false;
    void (async () => {
      setPhase('loading');
      setError(null);
      try {
        const persisted = await controller.findResumableSession(examId);
        if (cancelled) return;
        if (!persisted) {
          setPhase('idle');
          return;
        }
        try {
          const restored = await controller.resumeSimulator(persisted);
          if (cancelled) return;
          setSession(restored);
          setRemainingSeconds(restored.remainingSeconds);
          setCurrentIndex(0);
          setPhase('active');
        } catch (restoreErr) {
          if (cancelled) return;
          if (restoreErr instanceof SimulatorRestoreError) {
            staleDiscardId.current = persisted.id;
            setError(restoreErr.message);
            setPhase('restore_error');
          } else {
            setError('Could not restore your simulator session.');
            setPhase('idle');
          }
        }
      } catch {
        if (!cancelled) {
          setError('Could not load the exam simulator.');
          setPhase('idle');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [examId, controller]);

  const finalizeSubmit = useCallback(
    async (remaining: number) => {
      const current = sessionRef.current;
      if (!current || submittingRef.current) return;
      submittingRef.current = true;
      setConfirmation(null);
      setPhase('submitting');
      try {
        const res = await controller.submitSimulator(current.sessionId, Math.max(0, remaining));
        setResult(res);
        setPhase('result');
      } catch {
        setError('Could not submit the simulator. Please try again.');
        setPhase('active');
      } finally {
        submittingRef.current = false;
      }
    },
    [controller],
  );

  // Countdown: tick every second while active; auto-submit at zero (Req 5.2, 5.4).
  useEffect(() => {
    if (phase !== 'active' || paused) return;
    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          clearInterval(interval);
          void finalizeSubmit(0);
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, paused, finalizeSubmit]);

  // Pause/persist on background; resume on foreground (Req 5.8).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (sessionRef.current === null) return;
      if (next === 'background' || next === 'inactive') {
        setPaused(true);
        void controller.pauseSimulator(sessionRef.current.sessionId, remainingRef.current);
      } else if (next === 'active') {
        setPaused(false);
      }
    });
    return () => sub.remove();
  }, [controller]);

  const start = useCallback(async () => {
    if (!examId) return;
    setPhase('loading');
    setError(null);
    setResult(null);
    try {
      const created = await controller.startSimulator(examId);
      setSession(created);
      setRemainingSeconds(created.remainingSeconds);
      setCurrentIndex(0);
      setPaused(false);
      setPhase('active');
    } catch {
      setError('Could not start the simulator. Make sure exam content is available.');
      setPhase('idle');
    }
  }, [controller, examId]);

  const select = useCallback(
    async (questionId: string, answerId: string) => {
      const current = sessionRef.current;
      if (!current) return;
      setSession({ ...current, answers: { ...current.answers, [questionId]: answerId } });
      try {
        await controller.answerQuestion(current.sessionId, questionId, answerId);
      } catch {
        setError('Could not save your answer.');
      }
    },
    [controller],
  );

  const toggleFlag = useCallback(
    async (questionId: string) => {
      const current = sessionRef.current;
      if (!current) return;
      const isFlagged = current.flaggedQuestions.includes(questionId);
      const flaggedQuestions = isFlagged
        ? current.flaggedQuestions.filter((id) => id !== questionId)
        : [...current.flaggedQuestions, questionId];
      setSession({ ...current, flaggedQuestions });
      try {
        if (isFlagged) await controller.unflagQuestion(current.sessionId, questionId);
        else await controller.flagQuestion(current.sessionId, questionId);
      } catch {
        setError('Could not update the flag for that question.');
      }
    },
    [controller],
  );

  const goTo = useCallback((index: number) => {
    const current = sessionRef.current;
    if (!current) return;
    const clamped = Math.max(0, Math.min(index, current.questions.length - 1));
    setCurrentIndex(clamped);
  }, []);

  const goNext = useCallback(() => goTo((sessionRef.current ? currentIndex : 0) + 1), [goTo, currentIndex]);
  const goPrev = useCallback(() => goTo(currentIndex - 1), [goTo, currentIndex]);

  const requestSubmit = useCallback(() => {
    const current = sessionRef.current;
    if (!current) return;
    setConfirmation(buildConfirmationSummary(current));
  }, []);

  const cancelSubmit = useCallback(() => setConfirmation(null), []);

  const confirmSubmit = useCallback(async () => {
    await finalizeSubmit(remainingRef.current);
  }, [finalizeSubmit]);

  const discard = useCallback(async () => {
    const id = sessionRef.current?.sessionId ?? staleDiscardId.current;
    if (id) {
      try {
        await controller.discardSession(id);
      } catch {
        // Best-effort; the row simply remains until retention expiry.
      }
    }
    staleDiscardId.current = null;
    setSession(null);
    setResult(null);
    setConfirmation(null);
    setPhase('idle');
  }, [controller]);

  const restart = useCallback(async () => {
    const id = sessionRef.current?.sessionId ?? staleDiscardId.current;
    if (id) {
      try {
        await controller.discardSession(id);
      } catch {
        // Ignore — starting a fresh session is what matters.
      }
    }
    staleDiscardId.current = null;
    await start();
  }, [controller, start]);

  return {
    phase,
    error,
    session,
    currentIndex,
    remainingSeconds,
    paused,
    confirmation,
    result,
    start,
    select,
    toggleFlag,
    goTo,
    goNext,
    goPrev,
    requestSubmit,
    cancelSubmit,
    confirmSubmit,
    restart,
    discard,
  };
}
