// Integration test (Task 15.4): exam simulator pause/resume state persistence.
// Exercises the full lifecycle across a simulated app restart — start → answer →
// pause → (new controller instance) → resume → submit — and verifies the score
// feeds a completed study_sessions row. Requirements 5.6, 5.8.

import type {
  AnswerChoiceDTO,
  ExamDTO,
  QuestionDTO,
  SimulatorSessionDTO,
  StudySessionDTO,
} from '@db/repositories/types';
import { ExamSimulatorController } from '@domain/simulator/ExamSimulatorController';

const EXAM_ID = 'exam-1';
const NOW = 1_700_000_000_000;

function makeExam(): ExamDTO {
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
  };
}

function makeQuestion(id: string): QuestionDTO {
  return {
    id,
    examId: EXAM_ID,
    domainId: 'd1',
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

function makeDeps() {
  const pool = ['q1', 'q2', 'q3', 'q4'].map(makeQuestion);
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

  return { deps, sessions, studyCompletions };
}

describe('integration: simulator pause/resume/submit lifecycle', () => {
  test('persists across a restart and records the graded study session', async () => {
    const { deps, sessions, studyCompletions } = makeDeps();

    // 1. Start and partially complete a session.
    const controller = new ExamSimulatorController(deps);
    const started = await controller.startSimulator(EXAM_ID);
    await controller.answerQuestion(started.sessionId, 'q1', 'q1-correct');
    await controller.answerQuestion(started.sessionId, 'q2', 'q2-correct');
    await controller.flagQuestion(started.sessionId, 'q3');

    // 2. Pause (e.g. app backgrounded) — state is persisted.
    await controller.pauseSimulator(started.sessionId, 1800);
    expect(sessions.get(started.sessionId)?.state).toBe('paused');

    // 3. Restart: a brand-new controller has an empty in-memory cache.
    const afterRestart = new ExamSimulatorController(deps);
    const resumable = await afterRestart.findResumableSession(EXAM_ID);
    expect(resumable).not.toBeNull();

    const resumed = await afterRestart.resumeSimulator(resumable!);
    expect(resumed.answers).toEqual({ q1: 'q1-correct', q2: 'q2-correct' });
    expect(resumed.flaggedQuestions).toEqual(['q3']);
    expect(resumed.remainingSeconds).toBe(1800);

    // 4. Finish the remaining question and submit.
    await afterRestart.answerQuestion(resumed.sessionId, 'q3', 'q3-correct');
    await afterRestart.answerQuestion(resumed.sessionId, 'q4', 'q4-correct');
    const result = await afterRestart.submitSimulator(resumed.sessionId, 0);

    expect(result.scorePercent).toBe(100);
    expect(result.passed).toBe(true);
    expect(sessions.get(resumed.sessionId)?.state).toBe('submitted');
    // The graded score flows into a completed study session (feeds progress/readiness).
    expect(studyCompletions).toEqual([{ id: expect.any(String), score: 100, correctAnswers: 4 }]);
  });
});
