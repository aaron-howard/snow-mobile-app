import { Q } from '@nozbe/watermelondb';
import type { Database } from '@nozbe/watermelondb';
import type { SimulatorSession } from '../models/SimulatorSession';
import type { SimulatorSessionDTO, SimulatorSessionRepository } from './types';

export class WatermelonSimulatorSessionRepository implements SimulatorSessionRepository {
  constructor(private readonly db: Database) {}

  async getActive(userId: string, examId: string): Promise<SimulatorSessionDTO | null> {
    const rows = await this.db
      .get<SimulatorSession>('simulator_sessions')
      .query(
        Q.where('user_id', userId),
        Q.where('exam_id', examId),
        Q.where('state', Q.oneOf(['active', 'paused'])),
      )
      .fetch();
    return rows[0] ? toDTO(rows[0]) : null;
  }

  async create(
    session: Omit<
      SimulatorSessionDTO,
      'id' | 'answers' | 'flaggedQuestions' | 'submittedAt' | 'pausedAt'
    >,
  ): Promise<SimulatorSessionDTO> {
    let created!: SimulatorSession;
    await this.db.write(async () => {
      created = await this.db.get<SimulatorSession>('simulator_sessions').create((row) => {
        row.userId = session.userId;
        row.examId = session.examId;
        row.startedAt = session.startedAt;
        row.pausedAt = null;
        row.submittedAt = null;
        row.expiresAt = session.expiresAt;
        row.remainingSeconds = session.remainingSeconds;
        row.state = session.state;
        row.answersJson = '{}';
        row.flaggedJson = '[]';
      });
    });
    return toDTO(created);
  }

  async update(id: string, patch: Partial<SimulatorSessionDTO>): Promise<void> {
    await this.db.write(async () => {
      const row = await this.db.get<SimulatorSession>('simulator_sessions').find(id);
      await row.update((r) => {
        if (patch.pausedAt !== undefined) r.pausedAt = patch.pausedAt;
        if (patch.submittedAt !== undefined) r.submittedAt = patch.submittedAt;
        if (patch.remainingSeconds !== undefined) r.remainingSeconds = patch.remainingSeconds;
        if (patch.state !== undefined) r.state = patch.state;
        if (patch.answers !== undefined) r.answersJson = JSON.stringify(patch.answers);
        if (patch.flaggedQuestions !== undefined) {
          r.flaggedJson = JSON.stringify(patch.flaggedQuestions);
        }
      });
    });
  }

  async listRecent(userId: string, examId: string): Promise<SimulatorSessionDTO[]> {
    const now = Date.now();
    const rows = await this.db
      .get<SimulatorSession>('simulator_sessions')
      .query(
        Q.where('user_id', userId),
        Q.where('exam_id', examId),
        Q.where('expires_at', Q.gt(now)),
      )
      .fetch();
    return rows.map(toDTO);
  }
}

function toDTO(r: SimulatorSession): SimulatorSessionDTO {
  return {
    id: r.id,
    userId: r.userId,
    examId: r.examId,
    startedAt: r.startedAt,
    pausedAt: r.pausedAt,
    submittedAt: r.submittedAt,
    expiresAt: r.expiresAt,
    remainingSeconds: r.remainingSeconds,
    state: r.state,
    answers: r.answers,
    flaggedQuestions: r.flaggedQuestions,
  };
}
