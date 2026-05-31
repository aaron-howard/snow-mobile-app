import { Model } from '@nozbe/watermelondb';
import { field, text } from '@nozbe/watermelondb/decorators';

export class User extends Model {
  static table = 'users';

  @text('email') email!: string;
  @text('display_name') displayName!: string;
  @field('created_at') createdAt!: number;
  @field('streak_current') streakCurrent!: number;
  @field('streak_longest') streakLongest!: number;
  @field('total_questions_answered') totalQuestionsAnswered!: number;
  @field('total_study_sessions') totalStudySessions!: number;
}
