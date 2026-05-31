import { Model, type Relation } from '@nozbe/watermelondb';
import { field, immutableRelation, text } from '@nozbe/watermelondb/decorators';
import type { Question } from './Question';

export class AnswerChoice extends Model {
  static table = 'answer_choices';
  static associations = {
    questions: { type: 'belongs_to' as const, key: 'question_id' },
  };

  @text('question_id') questionId!: string;
  @text('text') text!: string;
  @field('is_correct') isCorrect!: boolean;
  @field('sort_order') sortOrder!: number;

  @immutableRelation('questions', 'question_id') question!: Relation<Question>;
}
