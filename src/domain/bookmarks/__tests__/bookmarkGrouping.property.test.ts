// Feature: servicenow-cert-study-app, Property 19
//
// Property 19 — Bookmark list is grouped by exam and sorted by date descending
// within each group.
//
// Validates: Requirements 7.3.

import fc from 'fast-check';
import { BookmarkService } from '../BookmarkService';
import type { BookmarkRecord } from '../types';

const bookmarkArb: fc.Arbitrary<BookmarkRecord> = fc.record({
  id: fc.uuid(),
  userId: fc.constant('u1'),
  itemType: fc.constantFrom<'question' | 'flashcard'>('question', 'flashcard'),
  itemId: fc.string({ minLength: 1, maxLength: 6 }),
  examId: fc.constantFrom('e1', 'e2', 'e3'),
  createdAt: fc.integer({ min: 0, max: 1_000_000 }),
});

describe('BookmarkService grouping + sort — Property 19', () => {
  test('groups by exam with each group sorted most-recent-first', () => {
    fc.assert(
      fc.property(fc.array(bookmarkArb, { maxLength: 30 }), (bookmarks) => {
        const sorted = BookmarkService.sortByDateDescending(bookmarks);
        const groups = BookmarkService.groupByExam(sorted);

        for (const [examId, group] of groups) {
          // Every member belongs to its exam.
          if (!group.every((b) => b.examId === examId)) return false;
          // Descending by createdAt.
          for (let i = 1; i < group.length; i += 1) {
            if (group[i - 1]!.createdAt < group[i]!.createdAt) return false;
          }
        }

        // No bookmark lost across groups.
        const grouped = [...groups.values()].reduce((sum, g) => sum + g.length, 0);
        return grouped === bookmarks.length;
      }),
      { numRuns: 300 },
    );
  });
});
