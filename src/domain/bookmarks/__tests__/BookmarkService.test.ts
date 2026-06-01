import { BookmarkService } from '../BookmarkService';
import type { BookmarkableItem, BookmarkRecord } from '../types';

function bm(overrides: Partial<BookmarkRecord> = {}): BookmarkRecord {
  return {
    id: 'bm-1',
    userId: 'u1',
    itemType: 'question',
    itemId: 'q1',
    examId: 'e1',
    createdAt: 1000,
    ...overrides,
  };
}

const item: BookmarkableItem = { id: 'q1', itemType: 'question', examId: 'e1' };

describe('BookmarkService', () => {
  test('toggle adds an absent item', () => {
    const result = BookmarkService.toggleBookmark(item, [], 2000);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ itemId: 'q1', itemType: 'question', examId: 'e1', createdAt: 2000 });
  });

  test('toggle removes a present item', () => {
    const result = BookmarkService.toggleBookmark(item, [bm()], 2000);
    expect(result).toHaveLength(0);
  });

  test('toggle does not match an item with a different type', () => {
    const flashcardSameId = bm({ id: 'bm-2', itemType: 'flashcard' });
    const result = BookmarkService.toggleBookmark(item, [flashcardSameId], 2000);
    expect(result).toHaveLength(2);
  });

  test('getBookmarksForExam filters by exam', () => {
    const list = [bm(), bm({ id: 'bm-2', examId: 'e2' })];
    expect(BookmarkService.getBookmarksForExam('e2', list)).toEqual([list[1]]);
  });

  test('sortByDateDescending orders most-recent-first without mutating', () => {
    const list = [bm({ createdAt: 1 }), bm({ id: 'bm-2', createdAt: 9 }), bm({ id: 'bm-3', createdAt: 5 })];
    const sorted = BookmarkService.sortByDateDescending(list);
    expect(sorted.map((b) => b.createdAt)).toEqual([9, 5, 1]);
    expect(list.map((b) => b.createdAt)).toEqual([1, 9, 5]);
  });

  test('groupByExam preserves order within a group', () => {
    const list = [
      bm({ id: 'a', examId: 'e1', createdAt: 9 }),
      bm({ id: 'b', examId: 'e2', createdAt: 8 }),
      bm({ id: 'c', examId: 'e1', createdAt: 7 }),
    ];
    const groups = BookmarkService.groupByExam(list);
    expect(groups.get('e1')?.map((b) => b.id)).toEqual(['a', 'c']);
    expect(groups.get('e2')?.map((b) => b.id)).toEqual(['b']);
  });
});
