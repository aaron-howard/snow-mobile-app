import type {
  AnswerChoiceRepository,
  ExamRepository,
  QuestionRepository,
  SimulatorSessionDTO,
  SimulatorSessionRepository,
  StudySessionRepository,
} from '@db/repositories/types';
import { calculateSimulatorResult } from './calculateSimulatorResult';
import type { SimulatorGradingQuestion } from './calculateSimulatorResult';
import type { SimulatorQuestion, SimulatorResult, SimulatorSession } from './types';

/** Simulator results are retained for ≥ 90 days (Requirement 5.7). */
export const SIMULATOR_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

/** Thrown when a paused session cannot be rebuilt from persisted state (Req 5.9). */
export class SimulatorRestoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SimulatorRestoreError';
  }
}

export interface ExamSimulatorControllerDeps {
  exams: Pick<ExamRepository, 'getById'>;
  questions: Pick<QuestionRepository, 'getPoolForSession'>;
  answerChoices: Pick<AnswerChoiceRepository, 'listByQuestion'>;
  simulatorSessions: Pick<SimulatorSessionRepository, 'create' | 'update' | 'getActive'>;
  studySessions: Pick<StudySessionRepository, 'create' | 'complete'>;
  userId: string;
  /** Clock seam for testing. */
  now?: () => number;
  /** Ordering seam; defaults to repository order so paused sessions can be rebuilt deterministically. */
  shuffle?: <T>(items: readonly T[]) => T[];
}

interface ActiveSim {
  examId: string;
  startedAt: number;
  passingThreshold: number;
  questions: SimulatorQuestion[];
  answers: Record<string, string>;
  flagged: Set<string>;
}

/**
 * Orchestrates a timed exam-simulator session (Requirements 5.1–5.9).
 *
 * The countdown itself lives in the UI (`useSimulator`); this controller owns
 * session lifecycle + persistence. The presented question set is the first
 * `officialQuestionCount` of the published pool in repository order (no shuffle
 * by default) so a paused session can be deterministically rebuilt on resume —
 * the `simulator_sessions` row persists answers/flags/remaining time but not the
 * question list. Grading is delegated to the pure `calculateSimulatorResult`.
 */
export class ExamSimulatorController {
  private readonly cache = new Map<string, ActiveSim>();
  private readonly now: () => number;
  private readonly shuffle: <T>(items: readonly T[]) => T[];

  constructor(private readonly deps: ExamSimulatorControllerDeps) {
    this.now = deps.now ?? Date.now;
    this.shuffle = deps.shuffle ?? ((items) => items.slice());
  }

  /** Begin a new simulator session for the exam (Req 5.1). */
  async startSimulator(examId: string): Promise<SimulatorSession> {
    const exam = await this.deps.exams.getById(examId);
    if (!exam) throw new Error(`Unknown exam: ${examId}`);

    const pool = await this.deps.questions.getPoolForSession(examId);
    const selected = this.shuffle(pool).slice(0, exam.officialQuestionCount);
    if (selected.length === 0) {
      throw new Error(`No published questions available for exam ${examId}`);
    }
    const questions = await this.loadQuestions(selected);

    const startedAt = this.now();
    const remainingSeconds = exam.officialDurationMinutes * 60;
    const expiresAt = startedAt + SIMULATOR_RETENTION_MS;

    const row = await this.deps.simulatorSessions.create({
      userId: this.deps.userId,
      examId,
      startedAt,
      expiresAt,
      remainingSeconds,
      state: 'active',
    });

    this.cache.set(row.id, {
      examId,
      startedAt,
      passingThreshold: exam.officialPassingScore,
      questions,
      answers: {},
      flagged: new Set(),
    });

    return {
      sessionId: row.id,
      examId,
      questions,
      answers: {},
      flaggedQuestions: [],
      remainingSeconds,
      state: 'active',
      expiresAt,
    };
  }

  /** Record (or overwrite) the answer for a question. */
  async answerQuestion(sessionId: string, questionId: string, answerId: string): Promise<void> {
    const sim = this.requireCached(sessionId);
    sim.answers[questionId] = answerId;
    await this.deps.simulatorSessions.update(sessionId, { answers: { ...sim.answers } });
  }

  /** Flag a question for review before submission (Req 5.3). */
  async flagQuestion(sessionId: string, questionId: string): Promise<void> {
    const sim = this.requireCached(sessionId);
    sim.flagged.add(questionId);
    await this.deps.simulatorSessions.update(sessionId, {
      flaggedQuestions: [...sim.flagged],
    });
  }

  async unflagQuestion(sessionId: string, questionId: string): Promise<void> {
    const sim = this.requireCached(sessionId);
    sim.flagged.delete(questionId);
    await this.deps.simulatorSessions.update(sessionId, {
      flaggedQuestions: [...sim.flagged],
    });
  }

  /**
   * Finalize and grade the session (Req 5.4 auto-submit, 5.6 results). Persists
   * the submitted simulator row and records a completed `study_sessions` row so
   * the score feeds progress tracking / readiness (Req 5.7 retention via
   * `expiresAt`).
   */
  async submitSimulator(sessionId: string, remainingSeconds = 0): Promise<SimulatorResult> {
    const sim = this.requireCached(sessionId);
    const gradingQuestions: SimulatorGradingQuestion[] = sim.questions.map((q) => ({
      id: q.question.id,
      domainId: q.question.domainId,
      explanation: q.question.explanation,
      correctAnswerId: q.choices.find((c) => c.isCorrect)?.id ?? null,
    }));

    const result = calculateSimulatorResult(
      { sessionId, answers: sim.answers, passingThreshold: sim.passingThreshold },
      gradingQuestions,
    );

    const submittedAt = this.now();
    await this.deps.simulatorSessions.update(sessionId, {
      state: 'submitted',
      submittedAt,
      remainingSeconds,
      answers: { ...sim.answers },
      flaggedQuestions: [...sim.flagged],
    });

    const study = await this.deps.studySessions.create({
      userId: this.deps.userId,
      examId: sim.examId,
      sessionType: 'simulator',
      startedAt: sim.startedAt,
      totalQuestions: sim.questions.length,
      durationSeconds: 0,
    });
    await this.deps.studySessions.complete(study.id, {
      completedAt: submittedAt,
      score: result.scorePercent,
      correctAnswers: result.correctAnswers,
      durationSeconds: Math.max(0, Math.round((submittedAt - sim.startedAt) / 1000)),
    });

    this.cache.delete(sessionId);
    return result;
  }

  /** Pause and persist remaining time when the app is backgrounded (Req 5.8). */
  async pauseSimulator(sessionId: string, remainingSeconds: number): Promise<void> {
    const sim = this.requireCached(sessionId);
    await this.deps.simulatorSessions.update(sessionId, {
      state: 'paused',
      pausedAt: this.now(),
      remainingSeconds,
      answers: { ...sim.answers },
      flaggedQuestions: [...sim.flagged],
    });
  }

  /** Find a resumable (active or paused) session for an exam, if any (Req 5.8). */
  async findResumableSession(examId: string): Promise<SimulatorSessionDTO | null> {
    return this.deps.simulatorSessions.getActive(this.deps.userId, examId);
  }

  /**
   * Rebuild a paused session from its persisted row (Req 5.8). The question set
   * is reconstructed from the published pool; if the exam is gone or the pool no
   * longer contains a previously answered/flagged question, restoration fails
   * with {@link SimulatorRestoreError} so the UI can offer restart/discard
   * (Req 5.9).
   */
  async resumeSimulator(persisted: SimulatorSessionDTO): Promise<SimulatorSession> {
    const exam = await this.deps.exams.getById(persisted.examId);
    if (!exam) {
      throw new SimulatorRestoreError(`Exam ${persisted.examId} is no longer available.`);
    }

    const pool = await this.deps.questions.getPoolForSession(persisted.examId);
    const selected = this.shuffle(pool).slice(0, exam.officialQuestionCount);
    if (selected.length === 0) {
      throw new SimulatorRestoreError('No questions are available to restore this session.');
    }
    const ids = new Set(selected.map((q) => q.id));

    // Any persisted answer/flag that is no longer in the pool means content
    // changed under us — the prior session can't be faithfully restored.
    const referenced = [...Object.keys(persisted.answers), ...persisted.flaggedQuestions];
    if (referenced.some((id) => !ids.has(id))) {
      throw new SimulatorRestoreError('Saved progress no longer matches the exam content.');
    }

    const questions = await this.loadQuestions(selected);

    this.cache.set(persisted.id, {
      examId: persisted.examId,
      startedAt: persisted.startedAt,
      passingThreshold: exam.officialPassingScore,
      questions,
      answers: { ...persisted.answers },
      flagged: new Set(persisted.flaggedQuestions),
    });

    await this.deps.simulatorSessions.update(persisted.id, { state: 'active' });

    return {
      sessionId: persisted.id,
      examId: persisted.examId,
      questions,
      answers: { ...persisted.answers },
      flaggedQuestions: [...persisted.flaggedQuestions],
      remainingSeconds: persisted.remainingSeconds,
      state: 'active',
      expiresAt: persisted.expiresAt,
    };
  }

  /** Discard an unrestorable or abandoned session (Req 5.9). */
  async discardSession(sessionId: string): Promise<void> {
    this.cache.delete(sessionId);
    await this.deps.simulatorSessions.update(sessionId, { state: 'discarded' });
  }

  private requireCached(sessionId: string): ActiveSim {
    const sim = this.cache.get(sessionId);
    if (!sim) throw new Error(`Unknown or inactive simulator session: ${sessionId}`);
    return sim;
  }

  private async loadQuestions(
    questions: readonly SimulatorQuestion['question'][],
  ): Promise<SimulatorQuestion[]> {
    return Promise.all(
      questions.map(async (question) => ({
        question,
        choices: await this.deps.answerChoices.listByQuestion(question.id),
      })),
    );
  }
}
