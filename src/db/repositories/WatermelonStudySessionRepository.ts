import { Q } from '@nozbe/watermelondb';
import type { Database } from '@nozbe/watermelondb';
import type { StudySession } from '../models/StudySession';
import type { StudySessionDTO, StudySessionRepository } from './types';

export class WatermelonStudySessionRepository implements StudySessionRepository {
  constructor(private readonly db: Database) {}

  async create(
    session: Omit<StudySessionDTO, 'id' | 'completedAt' | 'score' | 'correctAnswers'>,
  ): Promise<StudySessionDTO> {
    let created!: StudySession;
    await this.db.write(async () => {
      created = await this.db.get<StudySession>('study_sessions').create((row) => {
        row.userId = session.userId;
        row.examId = session.examId;
        row.sessionType = session.sessionType;
        row.startedAt = session.startedAt;
        row.completedAt = null;
        row.score = null;
        row.totalQuestions = session.totalQuestions;
        row.correctAnswers = 0;
        row.durationSeconds = session.durationSeconds;
      });
    });
    return toDTO(created);
  }

  async complete(
    id: string,
    completion: { completedAt: number; score: number; correctAnswers: number },
  ): Promise<void> {
    await this.db.write(async () => {
      const row = await this.db.get<StudySession>('study_sessions').find(id);
      await row.update((r) => {
        r.completedAt = completion.completedAt;
        r.score = completion.score;
        r.correctAnswers = completion.correctAnswers;
      });
    });
  }

  async listForUserExam(
    userId: string,
    examId: string,
    sinceMs?: number,
  ): Promise<StudySessionDTO[]> {
    const conditions = [Q.where('user_id', userId), Q.where('exam_id', examId)];
    if (sinceMs !== undefined) {
      conditions.push(Q.where('started_at', Q.gte(sinceMs)));
    }
    const rows = await this.db.get<StudySession>('study_sessions').query(...conditions).fetch();
    return rows.map(toDTO);
  }
}

function toDTO(r: StudySession): StudySessionDTO {
  return {
    id: r.id,
    userId: r.userId,
    examId: r.examId,
    sessionType: r.sessionType,
    startedAt: r.startedAt,
    completedAt: r.completedAt,
    score: r.score,
    totalQuestions: r.totalQuestions,
    correctAnswers: r.correctAnswers,
    durationSeconds: r.durationSeconds,
  };
}
