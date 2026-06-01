import { Q } from '@nozbe/watermelondb';
import type { Database } from '@nozbe/watermelondb';
import type { UserQuestionAttempt } from '../models/UserQuestionAttempt';
import type { Question } from '../models/Question';
import type {
  DomainAccuracyTally,
  UserQuestionAttemptDTO,
  UserQuestionAttemptRepository,
} from './types';

export class WatermelonUserQuestionAttemptRepository implements UserQuestionAttemptRepository {
  constructor(private readonly db: Database) {}

  async create(attempt: Omit<UserQuestionAttemptDTO, 'id'>): Promise<UserQuestionAttemptDTO> {
    let created!: UserQuestionAttempt;
    await this.db.write(async () => {
      created = await this.db.get<UserQuestionAttempt>('user_question_attempts').create((row) => {
        row.userId = attempt.userId;
        row.questionId = attempt.questionId;
        row.sessionId = attempt.sessionId;
        row.selectedAnswerId = attempt.selectedAnswerId;
        row.isCorrect = attempt.isCorrect;
        row.attemptedAt = attempt.attemptedAt;
      });
    });
    return toDTO(created);
  }

  async countIncorrectByQuestion(userId: string, examId: string): Promise<Map<string, number>> {
    // Two-step query: get all question IDs for this exam, then count incorrect attempts
    // restricted to that set. WatermelonDB has no JOIN; this is the idiomatic shape.
    const examQuestions = await this.db
      .get<Question>('questions')
      .query(Q.where('exam_id', examId))
      .fetch();
    const examQuestionIds = examQuestions.map((q) => q.id);
    if (examQuestionIds.length === 0) return new Map();

    const attempts = await this.db
      .get<UserQuestionAttempt>('user_question_attempts')
      .query(
        Q.where('user_id', userId),
        Q.where('is_correct', false),
        Q.where('question_id', Q.oneOf(examQuestionIds)),
      )
      .fetch();

    const counts = new Map<string, number>();
    for (const attempt of attempts) {
      counts.set(attempt.questionId, (counts.get(attempt.questionId) ?? 0) + 1);
    }
    return counts;
  }

  async accuracyByDomain(
    userId: string,
    examId: string,
    sinceMs?: number,
  ): Promise<DomainAccuracyTally[]> {
    // Step 1: map this exam's question IDs to their domain.
    const examQuestions = await this.db
      .get<Question>('questions')
      .query(Q.where('exam_id', examId))
      .fetch();
    if (examQuestions.length === 0) return [];
    const domainByQuestion = new Map(examQuestions.map((q) => [q.id, q.domainId]));

    // Step 2: fetch the user's attempts on those questions (optionally recent).
    const conditions = [
      Q.where('user_id', userId),
      Q.where('question_id', Q.oneOf([...domainByQuestion.keys()])),
    ];
    if (sinceMs !== undefined) {
      conditions.push(Q.where('attempted_at', Q.gte(sinceMs)));
    }
    const attempts = await this.db
      .get<UserQuestionAttempt>('user_question_attempts')
      .query(...conditions)
      .fetch();

    // Step 3: tally correct/total per domain.
    const tallies = new Map<string, { correct: number; total: number }>();
    for (const attempt of attempts) {
      const domainId = domainByQuestion.get(attempt.questionId);
      if (domainId === undefined) continue;
      const tally = tallies.get(domainId) ?? { correct: 0, total: 0 };
      tally.total += 1;
      if (attempt.isCorrect) tally.correct += 1;
      tallies.set(domainId, tally);
    }

    return [...tallies.entries()].map(([domainId, t]) => ({
      domainId,
      correct: t.correct,
      total: t.total,
    }));
  }
}

function toDTO(row: UserQuestionAttempt): UserQuestionAttemptDTO {
  return {
    id: row.id,
    userId: row.userId,
    questionId: row.questionId,
    sessionId: row.sessionId,
    selectedAnswerId: row.selectedAnswerId,
    isCorrect: row.isCorrect,
    attemptedAt: row.attemptedAt,
  };
}
