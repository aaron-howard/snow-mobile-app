import type {
  AnswerChoiceDTO,
  ExamDTO,
  QuestionDTO,
  SimulatorSessionDTO,
  StudySessionDTO,
} from '@db/repositories/types';
import {
  ExamSimulatorController,
  SimulatorRestoreError,
  SIMULATOR_RETENTION_MS,
} from '../ExamSimulatorController';

const EXAM_ID = 'exam-1';
const NOW = 1_700_000_000_000;

function makeExam(overrides: Partial<ExamDTO> = {}): ExamDTO {
  return {
    id: EXAM_ID,
    name: 'CSA',
    certificationLevel: 'associate',
    estimatedStudyHours: 40,
    officialDurationMinutes: 90,
    officialQuestionCount: 4,
    officialPassingScore: 70,
    minimumQuestionCount: 4,
    contentVersion: '1',
    contentDownloadedAt: NOW,
    isEnrolled: true,
    enrolledAt: NOW,
    ...overrides,
  };
}

function makeQuestion(id: string, domainId = 'd1'): QuestionDTO {
  return {
    id,
    examId: EXAM_ID,
    domainId,
    blueprintSkillId: 'bp1',
    text: `Question ${id}`,
    imageUrl: null,
    imageAltText: 'alt',
    explanation: `explain ${id}`,
    difficultyLevel: 'medium',
    bloomsLevel: 'apply',
    authorId: 'author',
    sourceNotes: '',
    reviewStatus: 'published',
    reviewedBy: null,
    reviewedAt: null,
    publishedAt: NOW,
    timesAnswered: 0,
    timesAnsweredCorrectly: 0,
    isPoolReset: false,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function makeChoices(questionId: string): AnswerChoiceDTO[] {
  return [
    { id: `${questionId}-correct`, questionId, text: 'Right', isCorrect: true, sortOrder: 0 },
    { id: `${questionId}-wrong`, questionId, text: 'Wrong', isCorrect: false, sortOrder: 1 },
  ];
}

interface Fakes {
  pool: QuestionDTO[];
  sessions: Map<string, SimulatorSessionDTO>;
  studyCompletions: { id: string; score: number; correctAnswers: number }[];
  deps: ConstructorParameters<typeof ExamSimulatorController>[0];
}

function makeFakes(poolIds: string[] = ['q1', 'q2', 'q3', 'q4']): Fakes {
  const pool = poolIds.map((id) => makeQuestion(id));
  const sessions = new Map<string, SimulatorSessionDTO>();
  const studyCompletions: { id: string; score: number; correctAnswers: number }[] = [];
  let seq = 0;

  const deps: ConstructorParameters<typeof ExamSimulatorController>[0] = {
    exams: { getById: async () => makeExam() },
    questions: { getPoolForSession: async () => pool.slice() },
    answerChoices: { listByQuestion: async (qid: string) => makeChoices(qid) },
    simulatorSessions: {
      create: async (session) => {
        const dto: SimulatorSessionDTO = {
          id: `sim-${++seq}`,
          ...session,
          pausedAt: null,
          submittedAt: null,
          answers: {},
          flaggedQuestions: [],
        };
        sessions.set(dto.id, dto);
        return dto;
      },
      update: async (id, patch) => {
        const existing = sessions.get(id);
        if (existing) sessions.set(id, { ...existing, ...patch });
      },
      getActive: async (_userId: string, examId: string) => {
        for (const s of sessions.values()) {
          if (s.examId === examId && (s.state === 'active' || s.state === 'paused')) return s;
        }
        return null;
      },
    },
    studySessions: {
      create: async (session) => {
        const row: StudySessionDTO = {
          id: `study-${++seq}`,
          ...session,
          completedAt: null,
          score: null,
          correctAnswers: 0,
        };
        return row;
      },
      complete: async (id, completion) => {
        studyCompletions.push({
          id,
          score: completion.score,
          correctAnswers: completion.correctAnswers,
        });
      },
    },
    userId: 'user-1',
    now: () => NOW,
  };

  return { pool, sessions, studyCompletions, deps };
}

describe('ExamSimulatorController', () => {
  test('startSimulator builds the session with timer + 90-day retention (Req 5.1, 5.7)', async () => {
    const { sessions, deps } = makeFakes();
    const controller = new ExamSimulatorController(deps);

    const session = await controller.startSimulator(EXAM_ID);

    expect(session.questions).toHaveLength(4);
    expect(session.remainingSeconds).toBe(90 * 60);
    expect(session.expiresAt).toBe(NOW + SIMULATOR_RETENTION_MS);
    expect(session.state).toBe('active');
    expect(sessions.get(session.sessionId)?.expiresAt).toBe(NOW + SIMULATOR_RETENTION_MS);
  });

  test('flagQuestion / unflagQuestion persist the flag set (Req 5.3)', async () => {
    const { sessions, deps } = makeFakes();
    const controller = new ExamSimulatorController(deps);
    const session = await controller.startSimulator(EXAM_ID);

    await controller.flagQuestion(session.sessionId, 'q2');
    expect(sessions.get(session.sessionId)?.flaggedQuestions).toEqual(['q2']);

    await controller.unflagQuestion(session.sessionId, 'q2');
    expect(sessions.get(session.sessionId)?.flaggedQuestions).toEqual([]);
  });

  test('submitSimulator grades and records a completed study session (Req 5.6)', async () => {
    const { sessions, studyCompletions, deps } = makeFakes();
    const controller = new ExamSimulatorController(deps);
    const session = await controller.startSimulator(EXAM_ID);

    // 3 correct, 1 left unanswered -> 75% (>= 70 threshold).
    await controller.answerQuestion(session.sessionId, 'q1', 'q1-correct');
    await controller.answerQuestion(session.sessionId, 'q2', 'q2-correct');
    await controller.answerQuestion(session.sessionId, 'q3', 'q3-correct');

    const result = await controller.submitSimulator(session.sessionId, 1000);

    expect(result.scorePercent).toBe(75);
    expect(result.passed).toBe(true);
    expect(result.correctAnswers).toBe(3);
    expect(result.incorrectQuestions).toEqual([{ questionId: 'q4', explanation: 'explain q4' }]);
    expect(sessions.get(session.sessionId)?.state).toBe('submitted');
    expect(studyCompletions).toEqual([
      { id: expect.any(String), score: 75, correctAnswers: 3 },
    ]);
  });

  test('pauseSimulator persists paused state and remaining time (Req 5.8)', async () => {
    const { sessions, deps } = makeFakes();
    const controller = new ExamSimulatorController(deps);
    const session = await controller.startSimulator(EXAM_ID);

    await controller.pauseSimulator(session.sessionId, 1234);

    const persisted = sessions.get(session.sessionId);
    expect(persisted?.state).toBe('paused');
    expect(persisted?.remainingSeconds).toBe(1234);
    expect(persisted?.pausedAt).toBe(NOW);
  });

  test('resumeSimulator rebuilds a paused session from persisted state (Req 5.8)', async () => {
    const { deps } = makeFakes();
    const controller = new ExamSimulatorController(deps);
    const session = await controller.startSimulator(EXAM_ID);
    await controller.answerQuestion(session.sessionId, 'q1', 'q1-correct');
    await controller.flagQuestion(session.sessionId, 'q2');
    await controller.pauseSimulator(session.sessionId, 999);

    // Fresh controller instance => empty in-memory cache, as after an app restart.
    const restarted = new ExamSimulatorController(deps);
    const persisted = await restarted.findResumableSession(EXAM_ID);
    expect(persisted).not.toBeNull();

    const restored = await restarted.resumeSimulator(persisted!);
    expect(restored.questions).toHaveLength(4);
    expect(restored.answers).toEqual({ q1: 'q1-correct' });
    expect(restored.flaggedQuestions).toEqual(['q2']);
    expect(restored.remainingSeconds).toBe(999);
    expect(restored.state).toBe('active');
  });

  test('resumeSimulator throws SimulatorRestoreError when content no longer matches (Req 5.9)', async () => {
    const { deps, pool } = makeFakes();
    const controller = new ExamSimulatorController(deps);
    const session = await controller.startSimulator(EXAM_ID);
    await controller.answerQuestion(session.sessionId, 'q1', 'q1-correct');
    await controller.pauseSimulator(session.sessionId, 500);

    // Simulate a content update that drops q1 from the pool.
    pool.splice(0, pool.length, ...['q5', 'q6', 'q7', 'q8'].map((id) => makeQuestion(id)));

    const restarted = new ExamSimulatorController(deps);
    const persisted = await restarted.findResumableSession(EXAM_ID);
    await expect(restarted.resumeSimulator(persisted!)).rejects.toBeInstanceOf(SimulatorRestoreError);
  });

  test('discardSession marks the session discarded (Req 5.9)', async () => {
    const { sessions, deps } = makeFakes();
    const controller = new ExamSimulatorController(deps);
    const session = await controller.startSimulator(EXAM_ID);

    await controller.discardSession(session.sessionId);
    expect(sessions.get(session.sessionId)?.state).toBe('discarded');
  });
});
