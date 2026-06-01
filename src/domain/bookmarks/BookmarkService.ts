import type { BookmarkableItem, BookmarkRecord } from './types';

/** Two bookmarks reference the same item when type + item id + exam match. */
function isSameItem(bookmark: BookmarkRecord, item: BookmarkableItem): boolean {
  return (
    bookmark.itemType === item.itemType &&
    bookmark.itemId === item.id &&
    bookmark.examId === item.examId
  );
}

/**
 * Pure bookmark list logic (Requirements 7.1–7.4). No I/O — callers persist the
 * resulting add/remove via the repository. `toggleBookmark` is an involution
 * (Property 18): toggling the same item twice restores the original set of
 * bookmarked items.
 */
export const BookmarkService = {
  /**
   * Add the item if absent, remove it if present. When adding, a record is
   * synthesized from `item` (the persisted id/timestamp are assigned by the
   * repository; `userId` is inherited from the existing list when available).
   * An optional `now`/`makeId` keep the add deterministic for tests.
   */
  toggleBookmark(
    item: BookmarkableItem,
    bookmarkList: readonly BookmarkRecord[],
    now: number = Date.now(),
    makeId: (item: BookmarkableItem) => string = (i) => `pending:${i.itemType}:${i.id}`,
  ): BookmarkRecord[] {
    const existing = bookmarkList.find((b) => isSameItem(b, item));
    if (existing) {
      return bookmarkList.filter((b) => b.id !== existing.id);
    }
    const record: BookmarkRecord = {
      id: makeId(item),
      userId: bookmarkList[0]?.userId ?? '',
      itemType: item.itemType,
      itemId: item.id,
      examId: item.examId,
      createdAt: now,
    };
    return [...bookmarkList, record];
  },

  /** Bookmarks for a single exam (Requirement 7.4, Property 20). */
  getBookmarksForExam(
    examId: string,
    bookmarkList: readonly BookmarkRecord[],
  ): BookmarkRecord[] {
    return bookmarkList.filter((b) => b.examId === examId);
  },

  /** Most-recent-first by `createdAt` (Requirement 7.3). Stable; non-mutating. */
  sortByDateDescending(bookmarks: readonly BookmarkRecord[]): BookmarkRecord[] {
    return [...bookmarks].sort((a, b) => b.createdAt - a.createdAt);
  },

  /**
   * Group by exam (Requirement 7.3). Insertion order is preserved within each
   * group, so passing a date-sorted list yields date-sorted groups.
   */
  groupByExam(bookmarks: readonly BookmarkRecord[]): Map<string, BookmarkRecord[]> {
    const groups = new Map<string, BookmarkRecord[]>();
    for (const bookmark of bookmarks) {
      const group = groups.get(bookmark.examId);
      if (group) group.push(bookmark);
      else groups.set(bookmark.examId, [bookmark]);
    }
    return groups;
  },
} as const;
