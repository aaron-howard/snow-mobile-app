import { QuizSessionManager, type QuizSessionManagerDeps } from '../QuizSessionManager';
import type {
  AnswerChoiceDTO,
  BookmarkDTO,
  QuestionDTO,
  StudySessionDTO,
  UserQuestionAttemptDTO,
} from '@db/repositories/types';

const NOW = 1_700_000_000_000;

function question(overrides: Partial<QuestionDTO> = {}): QuestionDTO {
  return {
    id: 'q1',
    examId: 'exam-1',
    domainId: 'dom-1',
    blueprintSkillId: 'bp-1',
    text: 'What is a Business Rule?',
    imageUrl: null,
    imageAltText: 'Question about Business Rules',
    explanation: 'A Business Rule runs server-side logic.',
    difficultyLevel: 'medium',
    bloomsLevel: 'understand',
    authorId: 'author-1',
    sourceNotes: '',
    reviewStatus: 'published',
    reviewedBy: null,
    reviewedAt: null,
    publishedAt: 1,
    timesAnswered: 0,
    timesAnsweredCorrectly: 0,
    isPoolReset: false,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

function choices(questionId: string, correctId: string): AnswerChoiceDTO[] {
  return ['a', 'b', 'c', 'd'].map((suffix, i) => ({
    id: `${questionId}-${suffix}`,
    questionId,
    text: `Choice ${suffix}`,
    isCorrect: `${questionId}-${suffix}` === correctId,
    sortOrder: i,
  }));
}

interface Harness {
  manager: QuizSessionManager;
  pool: QuestionDTO[];
  resetPool: jest.Mock;
  incrementAttemptCounters: jest.Mock;
  createAttempt: jest.Mock;
  completeSession: jest.Mock;
  bookmarksList: jest.Mock;
  choiceMap: Map<string, AnswerChoiceDTO[]>;
}

function makeManager(
  pool: QuestionDTO[],
  options: {
    choiceMap?: Map<string, AnswerChoiceDTO[]>;
    bookmarks?: BookmarkDTO[];
    poolAfterReset?: QuestionDTO[];
  } = {},
): Harness {
  const choiceMap =
    options.choiceMap ?? new Map(pool.map((q) => [q.id, choices(q.id, `${q.id}-a`)]));

  let getPoolCalls = 0;
  const resetPool = jest.fn().mockResolvedValue(undefined);
  const incrementAttemptCounters = jest.fn().mockResolvedValue(undefined);
  const createAttempt = jest.fn(
    async (a: Omit<UserQuestionAttemptDTO, 'id'>): Promise<UserQuestionAttemptDTO> => ({
      id: `att-${createAttempt.mock.calls.length}`,
      ...a,
    }),
  );
  const completeSession = jest.fn().mockResolvedValue(undefined);
  const bookmarksList = jest.fn().mockResolvedValue(options.bookmarks ?? []);

  let createdSessions = 0;

  const deps: QuizSessionManagerDeps = {
    questions: {
      getPoolForSession: jest.fn(async () => {
        getPoolCalls += 1;
        if (getPoolCalls > 1 && options.poolAfterReset) return options.poolAfterReset.slice();
        return pool.slice();
      }),
      getById: jest.fn(async (id: string) => pool.find((q) => q.id === id) ?? null),
      incrementAttemptCounters,
      resetPool,
    },
    answerChoices: {
      listByQuestion: jest.fn(async (id: string) => choiceMap.get(id) ?? []),
    },
    studySessions: {
      create: jest.fn(async (s): Promise<StudySessionDTO> => {
        createdSessions += 1;
        return {
          id: `session-${createdSessions}`,
          completedAt: null,
          score: null,
          correctAnswers: 0,
          ...s,
        };
      }),
      complete: completeSession,
    },
    attempts: { create: createAttempt },
    bookmarks: { listForUserAndExam: bookmarksList },
    userId: 'user-1',
    now: () => NOW,
  };

  return {
    manager: new QuizSessionManager(deps),
    pool,
    resetPool,
    incrementAttemptCounters,
    createAttempt,
    completeSession,
    bookmarksList,
    choiceMap,
  };
}

describe('QuizSessionManager.startSession', () => {
  test('builds a session from eligible published questions with their choices', async () => {
    const pool = [question({ id: 'q1' }), question({ id: 'q2' })];
    const { manager } = makeManager(pool);

    const session = await manager.startSession('exam-1');

    expect(session.questions).toHaveLength(2);
    expect(session.questions[0]!.choices).toHaveLength(4);
    expect(session.poolWasReset).toBe(false);
    expect(session.sessionId).toBe('session-1');
  });

  test('excludes already-answered questions that are not flagged for reset', async () => {
    const pool = [
      question({ id: 'q1', timesAnswered: 2, isPoolReset: false }),
      question({ id: 'q2', timesAnswered: 0 }),
    ];
    const { manager } = makeManager(pool);

    const session = await manager.startSession('exam-1');

    expect(session.questions.map((q) => q.question.id)).toEqual(['q2']);
  });

  test('resets the pool and flags poolWasReset when everything has been answered', async () => {
    const answered = [
      question({ id: 'q1', timesAnswered: 1 }),
      question({ id: 'q2', timesAnswered: 3 }),
    ];
    const afterReset = answered.map((q) => ({ ...q, isPoolReset: true }));
    const { manager, resetPool } = makeManager(answered, { poolAfterReset: afterReset });

    const session = await manager.startSession('exam-1');

    expect(resetPool).toHaveBeenCalledWith('exam-1');
    expect(session.poolWasReset).toBe(true);
    expect(session.questions).toHaveLength(2);
  });

  test('does not reset when the pool is empty', async () => {
    const { manager, resetPool } = makeManager([]);
    const session = await manager.startSession('exam-1');
    expect(resetPool).not.toHaveBeenCalled();
    expect(session.questions).toHaveLength(0);
  });
});

describe('QuizSessionManager.submitAnswer', () => {
  test('grades a correct answer, records it, and returns the explanation', async () => {
    const pool = [question({ id: 'q1', explanation: 'Correct because X.' })];
    const { manager, createAttempt, incrementAttemptCounters } = makeManager(pool);
    const session = await manager.startSession('exam-1');

    const result = await manager.submitAnswer(session.sessionId, 'q1', 'q1-a');

    expect(result.isCorrect).toBe(true);
    expect(result.correctAnswerId).toBe('q1-a');
    expect(result.explanation).toBe('Correct because X.');
    expect(createAttempt).toHaveBeenCalledWith(
      expect.objectContaining({ questionId: 'q1', isCorrect: true, userId: 'user-1' }),
    );
    expect(incrementAttemptCounters).toHaveBeenCalledWith('q1', true);
  });

  test('grades an incorrect answer and records it (placing it in the Review queue)', async () => {
    const pool = [question({ id: 'q1' })];
    const { manager, createAttempt } = makeManager(pool);
    const session = await manager.startSession('exam-1');

    const result = await manager.submitAnswer(session.sessionId, 'q1', 'q1-b');

    expect(result.isCorrect).toBe(false);
    expect(result.correctAnswerId).toBe('q1-a');
    expect(createAttempt).toHaveBeenCalledWith(
      expect.objectContaining({ questionId: 'q1', isCorrect: false }),
    );
  });

  test('returns feedback well within the 500 ms budget (Req 3.2)', async () => {
    const pool = [question({ id: 'q1' })];
    const { manager } = makeManager(pool);
    const session = await manager.startSession('exam-1');

    const start = Date.now();
    await manager.submitAnswer(session.sessionId, 'q1', 'q1-a');
    expect(Date.now() - start).toBeLessThan(500);
  });

  test('throws for an unknown session or question', async () => {
    const { manager } = makeManager([question({ id: 'q1' })]);
    const session = await manager.startSession('exam-1');
    await expect(manager.submitAnswer('nope', 'q1', 'q1-a')).rejects.toThrow();
    await expect(manager.submitAnswer(session.sessionId, 'ghost', 'x')).rejects.toThrow();
  });
});

describe('QuizSessionManager.endSession', () => {
  test('summarizes score, counts, and per-domain breakdown, then completes the row', async () => {
    const pool = [
      question({ id: 'q1', domainId: 'dom-1' }),
      question({ id: 'q2', domainId: 'dom-1' }),
      question({ id: 'q3', domainId: 'dom-2' }),
    ];
    const { manager, completeSession } = makeManager(pool);
    const session = await manager.startSession('exam-1');

    await manager.submitAnswer(session.sessionId, 'q1', 'q1-a'); // correct
    await manager.submitAnswer(session.sessionId, 'q2', 'q2-b'); // incorrect
    await manager.submitAnswer(session.sessionId, 'q3', 'q3-a'); // correct

    const summary = await manager.endSession(session.sessionId);

    expect(summary.correctAnswers).toBe(2);
    expect(summary.incorrectAnswers).toBe(1);
    expect(summary.scorePercent).toBe(67);
    expect(summary.domainBreakdown).toEqual(
      expect.arrayContaining([
        { domainId: 'dom-1', correct: 1, total: 2 },
        { domainId: 'dom-2', correct: 1, total: 1 },
      ]),
    );
    expect(completeSession).toHaveBeenCalledWith(
      session.sessionId,
      expect.objectContaining({ score: 67, correctAnswers: 2 }),
    );
  });

  test('scores zero when no questions were answered', async () => {
    const { manager } = makeManager([question({ id: 'q1' })]);
    const session = await manager.startSession('exam-1');
    const summary = await manager.endSession(session.sessionId);
    expect(summary.scorePercent).toBe(0);
    expect(summary.correctAnswers).toBe(0);
  });
});

describe('QuizSessionManager.startBookmarkSession', () => {
  test('builds a session from bookmarked questions only, skipping non-questions and missing ids', async () => {
    const pool = [question({ id: 'q1' }), question({ id: 'q2' })];
    const bookmarks: BookmarkDTO[] = [
      { id: 'bm1', userId: 'user-1', itemType: 'question', itemId: 'q1', examId: 'exam-1', createdAt: 1 },
      { id: 'bm2', userId: 'user-1', itemType: 'flashcard', itemId: 'fc1', examId: 'exam-1', createdAt: 2 },
      { id: 'bm3', userId: 'user-1', itemType: 'question', itemId: 'missing', examId: 'exam-1', createdAt: 3 },
    ];
    const { manager } = makeManager(pool, { bookmarks });

    const session = await manager.startBookmarkSession('exam-1');

    expect(session.isBookmarkSession).toBe(true);
    expect(session.questions.map((q) => q.question.id)).toEqual(['q1']);
  });
});
