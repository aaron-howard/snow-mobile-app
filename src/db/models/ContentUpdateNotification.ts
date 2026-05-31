import { Model } from '@nozbe/watermelondb';
import { field, text } from '@nozbe/watermelondb/decorators';

export class ContentUpdateNotification extends Model {
  static table = 'content_update_notifications';

  @text('exam_id') examId!: string;
  @text('content_version') contentVersion!: string;
  @field('published_at') publishedAt!: number;
  @field('notified_at') notifiedAt!: number | null;
}
