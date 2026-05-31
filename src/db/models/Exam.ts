import { Model, type Query } from '@nozbe/watermelondb';
import { children, field, text } from '@nozbe/watermelondb/decorators';
import type { TopicDomain } from './TopicDomain';
import type { Question } from './Question';

export class Exam extends Model {
  static table = 'exams';
  static associations = {
    topic_domains: { type: 'has_many' as const, foreignKey: 'exam_id' },
    questions: { type: 'has_many' as const, foreignKey: 'exam_id' },
    blueprint_skills: { type: 'has_many' as const, foreignKey: 'exam_id' },
  };

  @text('name') name!: string;
  @text('certification_level') certificationLevel!: string;
  @field('estimated_study_hours') estimatedStudyHours!: number;
  @field('official_duration_minutes') officialDurationMinutes!: number;
  @field('official_question_count') officialQuestionCount!: number;
  @field('official_passing_score') officialPassingScore!: number;
  @field('minimum_question_count') minimumQuestionCount!: number;
  @text('content_version') contentVersion!: string;
  @field('content_downloaded_at') contentDownloadedAt!: number | null;
  @field('is_enrolled') isEnrolled!: boolean;
  @field('enrolled_at') enrolledAt!: number | null;

  @children('topic_domains') topicDomains!: Query<TopicDomain>;
  @children('questions') questions!: Query<Question>;
}
