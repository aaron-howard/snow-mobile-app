// Feature: servicenow-cert-study-app, Property 18
//
// Property 18 — Bookmark toggle is an involution: toggling the same item twice
// restores the original set of bookmarked items.
//
// Validates: Requirements 7.1, 7.2.

import fc from 'fast-check';
import { BookmarkService } from '../BookmarkService';
import type { BookmarkableItem, BookmarkRecord } from '../types';

const itemArb: fc.Arbitrary<BookmarkableItem> = fc.record({
  id: fc.string({ minLength: 1, maxLength: 6 }),
  itemType: fc.constantFrom<'question' | 'flashcard'>('question', 'flashcard'),
  examId: fc.constantFrom('e1', 'e2'),
});

function bookmarkFor(item: BookmarkableItem, idx: number): BookmarkRecord {
  return {
    id: `bm-${idx}`,
    userId: 'u1',
    itemType: item.itemType,
    itemId: item.id,
    examId: item.examId,
    createdAt: 1000 + idx,
  };
}

/** Identity key ignoring the persisted row id/timestamp. */
function keyOf(b: BookmarkRecord): string {
  return `${b.itemType}|${b.itemId}|${b.examId}`;
}

function keySet(list: readonly BookmarkRecord[]): Set<string> {
  return new Set(list.map(keyOf));
}

describe('BookmarkService.toggleBookmark — Property 18', () => {
  test('double toggle restores the original bookmarked-item set', () => {
    fc.assert(
      fc.property(
        itemArb,
        fc.boolean(),
        fc.array(itemArb, { maxLength: 8 }),
        (item, initiallyBookmarked, others) => {
          const base = others
            .filter((o) => keyOf(bookmarkFor(o, 0)) !== keyOf(bookmarkFor(item, 0)))
            .map((o, i) => bookmarkFor(o, i + 1));
          const initial = initiallyBookmarked ? [...base, bookmarkFor(item, 0)] : base;

          const once = BookmarkService.toggleBookmark(item, initial, 5000);
          const twice = BookmarkService.toggleBookmark(item, once, 6000);

          // Single toggle flips membership.
          const presentInitially = keySet(initial).has(keyOf(bookmarkFor(item, 0)));
          const presentAfterOnce = keySet(once).has(keyOf(bookmarkFor(item, 0)));
          if (presentInitially === presentAfterOnce) return false;

          // Double toggle restores the full item set.
          const a = keySet(initial);
          const b = keySet(twice);
          return a.size === b.size && [...a].every((k) => b.has(k));
        },
      ),
      { numRuns: 300 },
    );
  });
});
