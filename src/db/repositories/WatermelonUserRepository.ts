import type { Database } from '@nozbe/watermelondb';
import type { User } from '../models/User';
import type { UserDTO, UserRepository } from './types';

export class WatermelonUserRepository implements UserRepository {
  constructor(private readonly db: Database) {}

  async getById(id: string): Promise<UserDTO | null> {
    try {
      return toDTO(await this.db.get<User>('users').find(id));
    } catch {
      return null;
    }
  }

  async upsert(user: UserDTO): Promise<void> {
    await this.db.write(async () => {
      try {
        const existing = await this.db.get<User>('users').find(user.id);
        await existing.update((row) => {
          row.email = user.email;
          row.displayName = user.displayName;
          row.streakCurrent = user.streakCurrent;
          row.streakLongest = user.streakLongest;
          row.totalQuestionsAnswered = user.totalQuestionsAnswered;
          row.totalStudySessions = user.totalStudySessions;
        });
      } catch {
        // Not found — create with the given Clerk user ID as the primary key.
        await this.db.get<User>('users').create((row) => {
          row._raw.id = user.id;
          row.email = user.email;
          row.displayName = user.displayName;
          row.createdAt = user.createdAt;
          row.streakCurrent = user.streakCurrent;
          row.streakLongest = user.streakLongest;
          row.totalQuestionsAnswered = user.totalQuestionsAnswered;
          row.totalStudySessions = user.totalStudySessions;
        });
      }
    });
  }

  async incrementCounters(
    id: string,
    delta: { questionsAnswered?: number; studySessions?: number },
  ): Promise<void> {
    await this.db.write(async () => {
      const row = await this.db.get<User>('users').find(id);
      await row.update((r) => {
        if (delta.questionsAnswered) {
          r.totalQuestionsAnswered = r.totalQuestionsAnswered + delta.questionsAnswered;
        }
        if (delta.studySessions) {
          r.totalStudySessions = r.totalStudySessions + delta.studySessions;
        }
      });
    });
  }

  async updateStreak(id: string, current: number, longest: number): Promise<void> {
    await this.db.write(async () => {
      const row = await this.db.get<User>('users').find(id);
      await row.update((r) => {
        r.streakCurrent = current;
        r.streakLongest = longest;
      });
    });
  }
}

function toDTO(row: User): UserDTO {
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    createdAt: row.createdAt,
    streakCurrent: row.streakCurrent,
    streakLongest: row.streakLongest,
    totalQuestionsAnswered: row.totalQuestionsAnswered,
    totalStudySessions: row.totalStudySessions,
  };
}
