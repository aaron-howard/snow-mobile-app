// Feature: servicenow-cert-study-app, Property 20
//
// Property 20 — Bookmark session presents only items for the selected exam.
//
// Validates: Requirements 7.4.

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

describe('BookmarkService.getBookmarksForExam — Property 20', () => {
  test('returns only bookmarks for the selected exam', () => {
    fc.assert(
      fc.property(
        fc.array(bookmarkArb, { maxLength: 30 }),
        fc.constantFrom('e1', 'e2', 'e3'),
        (bookmarks, examId) => {
          const result = BookmarkService.getBookmarksForExam(examId, bookmarks);
          // Only the selected exam.
          if (!result.every((b) => b.examId === examId)) return false;
          // Nothing for that exam is dropped.
          const expected = bookmarks.filter((b) => b.examId === examId).length;
          return result.length === expected;
        },
      ),
      { numRuns: 300 },
    );
  });
});
