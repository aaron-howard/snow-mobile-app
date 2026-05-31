import { Model, type Relation } from '@nozbe/watermelondb';
import { field, immutableRelation, text } from '@nozbe/watermelondb/decorators';
import type { Exam } from './Exam';
import type { TopicDomain } from './TopicDomain';

/**
 * Blueprint skill (Requirement 11.5). Every published question references
 * one of these so content provenance is traceable to a public source.
 */
export class BlueprintSkill extends Model {
  static table = 'blueprint_skills';
  static associations = {
    exams: { type: 'belongs_to' as const, key: 'exam_id' },
    topic_domains: { type: 'belongs_to' as const, key: 'domain_id' },
  };

  @text('exam_id') examId!: string;
  @text('domain_id') domainId!: string;
  @text('code') code!: string;
  @text('description') description!: string;
  @text('blueprint_source_url') blueprintSourceUrl!: string;
  @field('blueprint_retrieved_at') blueprintRetrievedAt!: number;

  @immutableRelation('exams', 'exam_id') exam!: Relation<Exam>;
  @immutableRelation('topic_domains', 'domain_id') domain!: Relation<TopicDomain>;
}
