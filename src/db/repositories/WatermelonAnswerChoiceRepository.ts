import { Q } from '@nozbe/watermelondb';
import type { Database } from '@nozbe/watermelondb';
import type { AnswerChoice } from '../models/AnswerChoice';
import type { AnswerChoiceDTO, AnswerChoiceRepository } from './types';

export class WatermelonAnswerChoiceRepository implements AnswerChoiceRepository {
  constructor(private readonly db: Database) {}

  async listByQuestion(questionId: string): Promise<AnswerChoiceDTO[]> {
    const rows = await this.db
      .get<AnswerChoice>('answer_choices')
      .query(Q.where('question_id', questionId), Q.sortBy('sort_order', Q.asc))
      .fetch();
    return rows.map((r) => ({
      id: r.id,
      questionId: r.questionId,
      text: r.text,
      isCorrect: r.isCorrect,
      sortOrder: r.sortOrder,
    }));
  }
}
