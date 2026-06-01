/** A swiped-left card is re-inserted at least this many positions ahead (Req 4.6). */
export const FLASHCARD_REINSERT_OFFSET = 3;

/**
 * Pure reordering logic for the active flashcard pool (Requirements 4.5, 4.6).
 *
 * `swipeRight` ("Known") removes the card from the active pool. `swipeLeft`
 * ("Still Learning") removes it from the current position and re-inserts it at
 * least {@link FLASHCARD_REINSERT_OFFSET} positions ahead (Property 12),
 * clamping to the end of the pool when fewer cards remain.
 */
export const FlashcardSessionManager = {
  swipeRight<T>(pool: readonly T[], currentIndex: number): T[] {
    if (currentIndex < 0 || currentIndex >= pool.length) return pool.slice();
    return [...pool.slice(0, currentIndex), ...pool.slice(currentIndex + 1)];
  },

  swipeLeft<T>(pool: readonly T[], currentIndex: number): T[] {
    if (currentIndex < 0 || currentIndex >= pool.length) return pool.slice();
    const card = pool[currentIndex] as T;
    const rest = [...pool.slice(0, currentIndex), ...pool.slice(currentIndex + 1)];
    const target = Math.min(currentIndex + FLASHCARD_REINSERT_OFFSET, rest.length);
    rest.splice(target, 0, card);
    return rest;
  },
} as const;
