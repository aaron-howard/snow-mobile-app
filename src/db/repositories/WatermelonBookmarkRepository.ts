import { Q } from '@nozbe/watermelondb';
import type { Database } from '@nozbe/watermelondb';
import type { Bookmark } from '../models/Bookmark';
import type { BookmarkDTO, BookmarkRepository } from './types';

export class WatermelonBookmarkRepository implements BookmarkRepository {
  constructor(private readonly db: Database) {}

  async listForUser(userId: string): Promise<BookmarkDTO[]> {
    const rows = await this.db
      .get<Bookmark>('bookmarks')
      .query(Q.where('user_id', userId))
      .fetch();
    return rows.map(toDTO);
  }

  async listForUserAndExam(userId: string, examId: string): Promise<BookmarkDTO[]> {
    const rows = await this.db
      .get<Bookmark>('bookmarks')
      .query(Q.where('user_id', userId), Q.where('exam_id', examId))
      .fetch();
    return rows.map(toDTO);
  }

  async find(
    userId: string,
    itemType: 'question' | 'flashcard',
    itemId: string,
  ): Promise<BookmarkDTO | null> {
    const rows = await this.db
      .get<Bookmark>('bookmarks')
      .query(
        Q.where('user_id', userId),
        Q.where('item_type', itemType),
        Q.where('item_id', itemId),
      )
      .fetch();
    return rows[0] ? toDTO(rows[0]) : null;
  }

  async create(bookmark: Omit<BookmarkDTO, 'id'>): Promise<BookmarkDTO> {
    let created!: Bookmark;
    await this.db.write(async () => {
      created = await this.db.get<Bookmark>('bookmarks').create((row) => {
        row.userId = bookmark.userId;
        row.itemType = bookmark.itemType;
        row.itemId = bookmark.itemId;
        row.examId = bookmark.examId;
        row.createdAt = bookmark.createdAt;
      });
    });
    return toDTO(created);
  }

  async delete(id: string): Promise<void> {
    await this.db.write(async () => {
      const row = await this.db.get<Bookmark>('bookmarks').find(id);
      await row.markAsDeleted();
    });
  }
}

function toDTO(row: Bookmark): BookmarkDTO {
  return {
    id: row.id,
    userId: row.userId,
    itemType: row.itemType,
    itemId: row.itemId,
    examId: row.examId,
    createdAt: row.createdAt,
  };
}
