import { Model, type Query, type Relation } from '@nozbe/watermelondb';
import { children, field, immutableRelation, text } from '@nozbe/watermelondb/decorators';
import type { Exam } from './Exam';
import type { TopicDomain } from './TopicDomain';
import type { BlueprintSkill } from './BlueprintSkill';
import type { AnswerChoice } from './AnswerChoice';

export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type BloomsLevel = 'remember' | 'understand' | 'apply' | 'analyze';
export type ReviewStatus = 'draft' | 'reviewed' | 'published';

export class Question extends Model {
  static table = 'questions';
  static associations = {
    exams: { type: 'belongs_to' as const, key: 'exam_id' },
    topic_domains: { type: 'belongs_to' as const, key: 'domain_id' },
    blueprint_skills: { type: 'belongs_to' as const, key: 'blueprint_skill_id' },
    answer_choices: { type: 'has_many' as const, foreignKey: 'question_id' },
  };

  @text('exam_id') examId!: string;
  @text('domain_id') domainId!: string;
  @text('blueprint_skill_id') blueprintSkillId!: string;
  @text('text') text!: string;
  @text('image_url') imageUrl!: string | null;
  @text('image_alt_text') imageAltText!: string;
  @text('explanation') explanation!: string;
  @text('difficulty_level') difficultyLevel!: DifficultyLevel;
  @text('blooms_level') bloomsLevel!: BloomsLevel;
  @text('author_id') authorId!: string;
  @text('source_notes') sourceNotes!: string;
  @text('review_status') reviewStatus!: ReviewStatus;
  @text('reviewed_by') reviewedBy!: string | null;
  @field('reviewed_at') reviewedAt!: number | null;
  @field('published_at') publishedAt!: number | null;
  @field('times_answered') timesAnswered!: number;
  @field('times_answered_correctly') timesAnsweredCorrectly!: number;
  @field('is_pool_reset') isPoolReset!: boolean;
  @field('created_at') createdAt!: number;
  @field('updated_at') updatedAt!: number;

  @immutableRelation('exams', 'exam_id') exam!: Relation<Exam>;
  @immutableRelation('topic_domains', 'domain_id') domain!: Relation<TopicDomain>;
  @immutableRelation('blueprint_skills', 'blueprint_skill_id')
  blueprintSkill!: Relation<BlueprintSkill>;
  @children('answer_choices') answerChoices!: Query<AnswerChoice>;
}
