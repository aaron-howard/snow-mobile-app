import { Q } from '@nozbe/watermelondb';
import type { Database } from '@nozbe/watermelondb';
import type { TopicDomain } from '../models/TopicDomain';
import type { TopicDomainDTO, TopicDomainRepository } from './types';

export class WatermelonTopicDomainRepository implements TopicDomainRepository {
  constructor(private readonly db: Database) {}

  async listByExam(examId: string): Promise<TopicDomainDTO[]> {
    const rows = await this.db
      .get<TopicDomain>('topic_domains')
      .query(Q.where('exam_id', examId))
      .fetch();
    return rows.map((r) => ({
      id: r.id,
      examId: r.examId,
      name: r.name,
      weightPercent: r.weightPercent,
    }));
  }
}
