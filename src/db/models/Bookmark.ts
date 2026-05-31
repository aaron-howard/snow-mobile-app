import { Model } from '@nozbe/watermelondb';
import { field, text } from '@nozbe/watermelondb/decorators';

export type BookmarkItemType = 'question' | 'flashcard';

export class Bookmark extends Model {
  static table = 'bookmarks';

  @text('user_id') userId!: string;
  @text('item_type') itemType!: BookmarkItemType;
  @text('item_id') itemId!: string;
  @text('exam_id') examId!: string;
  @field('created_at') createdAt!: number;
}
