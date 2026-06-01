import type { BookmarkDTO } from '@db/repositories/types';

/** A persisted bookmark. Mirrors the data-layer DTO exactly. */
export type BookmarkRecord = BookmarkDTO;

/** The minimal identity needed to toggle a bookmark for a question or flashcard. */
export interface BookmarkableItem {
  /** The bookmarked item's id (questionId or flashcardId). */
  id: string;
  itemType: 'question' | 'flashcard';
  examId: string;
}
