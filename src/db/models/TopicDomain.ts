import { Model, type Relation } from '@nozbe/watermelondb';
import { field, immutableRelation, text } from '@nozbe/watermelondb/decorators';
import type { Exam } from './Exam';

export class TopicDomain extends Model {
  static table = 'topic_domains';
  static associations = {
    exams: { type: 'belongs_to' as const, key: 'exam_id' },
  };

  @text('exam_id') examId!: string;
  @text('name') name!: string;
  @field('weight_percent') weightPercent!: number;

  @immutableRelation('exams', 'exam_id') exam!: Relation<Exam>;
}
