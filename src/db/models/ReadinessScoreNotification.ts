import { Model } from '@nozbe/watermelondb';
import { field, text } from '@nozbe/watermelondb/decorators';

export type ReadinessNotificationType = 'congratulatory' | 'readiness_80';

export class ReadinessScoreNotification extends Model {
  static table = 'readiness_score_notifications';

  @text('user_id') userId!: string;
  @text('exam_id') examId!: string;
  @text('notification_type') notificationType!: ReadinessNotificationType;
  @field('score_at_notification') scoreAtNotification!: number;
  @field('sent_at') sentAt!: number;
}
