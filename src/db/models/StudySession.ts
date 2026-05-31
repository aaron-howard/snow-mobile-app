import { Model } from '@nozbe/watermelondb';
import { field, text } from '@nozbe/watermelondb/decorators';

export type SessionType = 'quiz' | 'flashcard' | 'simulator';

export class StudySession extends Model {
  static table = 'study_sessions';

  @text('user_id') userId!: string;
  @text('exam_id') examId!: string;
  @text('session_type') sessionType!: SessionType;
  @field('started_at') startedAt!: number;
  @field('completed_at') completedAt!: number | null;
  @field('score') score!: number | null;
  @field('total_questions') totalQuestions!: number;
  @field('correct_answers') correctAnswers!: number;
  @field('duration_seconds') durationSeconds!: number;
}
