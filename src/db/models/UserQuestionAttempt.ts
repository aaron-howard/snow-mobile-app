import { Model } from '@nozbe/watermelondb';
import { field, text } from '@nozbe/watermelondb/decorators';

export class UserQuestionAttempt extends Model {
  static table = 'user_question_attempts';

  @text('user_id') userId!: string;
  @text('question_id') questionId!: string;
  @text('session_id') sessionId!: string;
  @text('selected_answer_id') selectedAnswerId!: string;
  @field('is_correct') isCorrect!: boolean;
  @field('attempted_at') attemptedAt!: number;
}
