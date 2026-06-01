import type {
  AnswerChoiceRepository,
  BookmarkRepository,
  QuestionRepository,
  StudySessionRepository,
  UserQuestionAttemptRepository,
} from '@db/repositories/types';
import type { AnswerResult, QuestionRecord, QuizQuestion, QuizSession, SessionSummary } from './types';

export interface QuizSessionManagerDeps {
  questions: Pick<
    QuestionRepository,
    'getPoolForSession' | 'getById' | 'incrementAttemptCounters' | 'resetPool'
  >;
  answerChoices: Pick<AnswerChoiceRepository, 'listByQuestion'>;
  studySessions: Pick<StudySessionRepository, 'create' | 'complete'>;
  attempts: Pick<UserQuestionAttemptRepository, 'create'>;
  bookmarks: Pick<BookmarkRepository, 'listForUserAndExam'>;
  userId: string;
  /** Clock seam for testing. */
  now?: () => number;
  /** Ordering seam; defaults to preserving repository order (deterministic for tests). */
  shuffle?: <T>(items: readonly T[]) => T[];
}

interface AnswerState {
  isCorrect: boolean;
  domainId: string;
}

interface ActiveSession {
  examId: string;
  byId: Map<string, QuizQuestion>;
  /** questionId -> latest answer state for this session. */
  answers: Map<string, AnswerState>;
  poolWasReset: boolean;
  /** Epoch ms the session row was created, for duration recording (Req 6.1). */
  startedAt: number;
}

/**
 * Orchestrates a practice-quiz session (Requirements 3.1–3.9).
 *
 * In-memory session state (the question set + answers) is held per `sessionId`
 * while the backing `study_sessions` row and per-question attempts are
 * persisted through injected repositories. Pure decisions (review-queue
 * membership, domain attribution) live in their own functions; this class only
 * coordinates I/O and per-session bookkeeping.
 */
export class QuizSessionManager {
  private readonly sessions = new Map<string, ActiveSession>();
  private readonly now: () => number;
  private readonly shuffle: <T>(items: readonly T[]) => T[];

  constructor(private readonly deps: QuizSessionManagerDeps) {
    this.now = deps.now ?? Date.now;
    this.shuffle = deps.shuffle ?? ((items) => items.slice());
  }

  /**
   * Start a quiz from the published pool, optionally filtered to one domain.
   * When every eligible question has already been answered, the pool is reset
   * (Req 3.8) and `poolWasReset` is flagged so the UI can notify (Req 3.9).
   */
  async startSession(examId: string, domainFilter?: string): Promise<QuizSession> {
    const pool = await this.deps.questions.getPoolForSession(examId, domainFilter);
    let eligible = pool.filter((q) => q.timesAnswered === 0 || q.isPoolReset);
    let poolWasReset = false;

    if (eligible.length === 0 && pool.length > 0) {
      await this.deps.questions.resetPool(examId);
      poolWasReset = true;
      const refreshed = await this.deps.questions.getPoolForSession(examId, domainFilter);
      eligible = refreshed.length > 0 ? refreshed : pool;
    }

    const ordered = this.shuffle(eligible);
    const quizQuestions = await this.loadQuizQuestions(ordered);
    return this.createSession(examId, domainFilter ?? null, false, quizQuestions, poolWasReset);
  }

  /** Start a quiz built only from the user's bookmarked questions for an exam. */
  async startBookmarkSession(examId: string): Promise<QuizSession> {
    const bookmarks = await this.deps.bookmarks.listForUserAndExam(this.deps.userId, examId);
    const questionIds = bookmarks.filter((b) => b.itemType === 'question').map((b) => b.itemId);
    const loaded = await Promise.all(questionIds.map((id) => this.deps.questions.getById(id)));
    const questions = loaded.filter((q): q is QuestionRecord => q !== null);
    const ordered = this.shuffle(questions);
    const quizQuestions = await this.loadQuizQuestions(ordered);
    return this.createSession(examId, null, true, quizQuestions, false);
  }

  /**
   * Grade and record an answer. Correctness is computed locally (no network) so
   * feedback is well within the 500 ms budget (Req 3.2). Recording an incorrect
   * attempt is what places the question in the Review queue (Req 3.5), since the
   * queue is derived from incorrect attempts.
   */
  async submitAnswer(
    sessionId: string,
    questionId: string,
    answerId: string,
  ): Promise<AnswerResult> {
    const session = this.requireSession(sessionId);
    const item = session.byId.get(questionId);
    if (!item) {
      throw new Error(`Question ${questionId} is not part of session ${sessionId}`);
    }

    const correctChoice = item.choices.find((c) => c.isCorrect);
    const isCorrect = correctChoice !== undefined && correctChoice.id === answerId;

    await this.deps.attempts.create({
      userId: this.deps.userId,
      questionId,
      sessionId,
      selectedAnswerId: answerId,
      isCorrect,
      attemptedAt: this.now(),
    });
    await this.deps.questions.incrementAttemptCounters(questionId, isCorrect);

    session.answers.set(questionId, { isCorrect, domainId: item.question.domainId });

    return {
      questionId,
      selectedAnswerId: answerId,
      isCorrect,
      correctAnswerId: correctChoice?.id ?? '',
      explanation: item.question.explanation,
    };
  }

  /** Finalize the session and return its summary (Req 3.3). */
  async endSession(sessionId: string): Promise<SessionSummary> {
    const session = this.requireSession(sessionId);

    let correct = 0;
    const domainMap = new Map<string, { correct: number; total: number }>();
    for (const state of session.answers.values()) {
      if (state.isCorrect) correct += 1;
      const bucket = domainMap.get(state.domainId) ?? { correct: 0, total: 0 };
      bucket.total += 1;
      if (state.isCorrect) bucket.correct += 1;
      domainMap.set(state.domainId, bucket);
    }

    const answered = session.answers.size;
    const incorrect = answered - correct;
    const scorePercent = answered === 0 ? 0 : Math.round((correct / answered) * 100);

    const completedAt = this.now();
    await this.deps.studySessions.complete(sessionId, {
      completedAt,
      score: scorePercent,
      correctAnswers: correct,
      durationSeconds: Math.max(0, Math.round((completedAt - session.startedAt) / 1000)),
    });

    this.sessions.delete(sessionId);

    return {
      sessionId,
      correctAnswers: correct,
      incorrectAnswers: incorrect,
      scorePercent,
      domainBreakdown: Array.from(domainMap.entries()).map(([domainId, bucket]) => ({
        domainId,
        correct: bucket.correct,
        total: bucket.total,
      })),
      poolWasReset: session.poolWasReset,
    };
  }

  private requireSession(sessionId: string): ActiveSession {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Unknown quiz session: ${sessionId}`);
    return session;
  }

  private async loadQuizQuestions(questions: readonly QuestionRecord[]): Promise<QuizQuestion[]> {
    return Promise.all(
      questions.map(async (question) => ({
        question,
        choices: await this.deps.answerChoices.listByQuestion(question.id),
      })),
    );
  }

  private async createSession(
    examId: string,
    domainFilter: string | null,
    isBookmarkSession: boolean,
    quizQuestions: QuizQuestion[],
    poolWasReset: boolean,
  ): Promise<QuizSession> {
    const row = await this.deps.studySessions.create({
      userId: this.deps.userId,
      examId,
      sessionType: 'quiz',
      startedAt: this.now(),
      totalQuestions: quizQuestions.length,
      durationSeconds: 0,
    });

    this.sessions.set(row.id, {
      examId,
      byId: new Map(quizQuestions.map((q) => [q.question.id, q])),
      answers: new Map(),
      poolWasReset,
      startedAt: row.startedAt,
    });

    return {
      sessionId: row.id,
      examId,
      domainFilter,
      isBookmarkSession,
      questions: quizQuestions,
      poolWasReset,
    };
  }
}
