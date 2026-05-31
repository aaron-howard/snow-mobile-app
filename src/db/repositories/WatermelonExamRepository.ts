import { Q } from '@nozbe/watermelondb';
import type { Database } from '@nozbe/watermelondb';
import type { Exam } from '../models/Exam';
import type { ExamDTO, ExamRepository } from './types';

export class WatermelonExamRepository implements ExamRepository {
  constructor(private readonly db: Database) {}

  async list(): Promise<ExamDTO[]> {
    const rows = await this.db.get<Exam>('exams').query().fetch();
    return rows.map(toDTO);
  }

  async getById(id: string): Promise<ExamDTO | null> {
    try {
      return toDTO(await this.db.get<Exam>('exams').find(id));
    } catch {
      return null;
    }
  }

  async listEnrolled(): Promise<ExamDTO[]> {
    const rows = await this.db
      .get<Exam>('exams')
      .query(Q.where('is_enrolled', true))
      .fetch();
    return rows.map(toDTO);
  }

  async setEnrollment(id: string, enrolled: boolean, enrolledAt: number | null): Promise<void> {
    await this.db.write(async () => {
      const row = await this.db.get<Exam>('exams').find(id);
      await row.update((r) => {
        r.isEnrolled = enrolled;
        r.enrolledAt = enrolledAt;
      });
    });
  }

  async markContentDownloaded(
    id: string,
    downloadedAt: number,
    contentVersion: string,
  ): Promise<void> {
    await this.db.write(async () => {
      const row = await this.db.get<Exam>('exams').find(id);
      await row.update((r) => {
        r.contentDownloadedAt = downloadedAt;
        r.contentVersion = contentVersion;
      });
    });
  }
}

function toDTO(row: Exam): ExamDTO {
  return {
    id: row.id,
    name: row.name,
    certificationLevel: row.certificationLevel,
    estimatedStudyHours: row.estimatedStudyHours,
    officialDurationMinutes: row.officialDurationMinutes,
    officialQuestionCount: row.officialQuestionCount,
    officialPassingScore: row.officialPassingScore,
    minimumQuestionCount: row.minimumQuestionCount,
    contentVersion: row.contentVersion,
    contentDownloadedAt: row.contentDownloadedAt,
    isEnrolled: row.isEnrolled,
    enrolledAt: row.enrolledAt,
  };
}
