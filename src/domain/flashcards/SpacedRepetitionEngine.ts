import type { FlashcardSRSState, ResponseQuality } from './types';

/** SM-2 ease factor floor (Requirement 4.8, Property 11). */
export const MIN_EASE_FACTOR = 1.3;
/** Initial ease factor for a freshly created card. */
export const DEFAULT_EASE_FACTOR = 2.5;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * SM-2 ease-factor update, clamped at {@link MIN_EASE_FACTOR}. Applied on every
 * review regardless of quality, guaranteeing the factor never drops below 1.3.
 */
function updatedEaseFactor(easeFactor: number, quality: ResponseQuality): number {
  const next = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  return Math.max(MIN_EASE_FACTOR, next);
}

/**
 * The interval a "Known" response would yield for this card — computed from the
 * card's *current* ease factor so it is identical for every passing quality
 * (3–5). Kept ≥ 2 days so the "Still Learning" half (floor/2) is always ≥ 1.
 */
function knownIntervalDays(card: FlashcardSRSState): number {
  if (card.repetitionCount <= 0) return 2;
  if (card.repetitionCount === 1) return 6;
  return Math.max(2, Math.round(card.intervalDays * card.easeFactor));
}

/**
 * Pure SM-2 spaced-repetition engine (Requirement 4.8).
 *
 * The "Still Learning" interval is defined as `floor(knownInterval / 2)`, which
 * is always ≤ 50% of the "Known" interval for the same card (Property 10). The
 * ease factor is updated and clamped at 1.3 on every call (Property 11).
 */
export const SpacedRepetitionEngine = {
  computeNextInterval<T extends FlashcardSRSState>(
    card: T,
    quality: ResponseQuality,
    now: number = Date.now(),
  ): T {
    const easeFactor = updatedEaseFactor(card.easeFactor, quality);
    const isKnown = quality >= 3;
    const known = knownIntervalDays(card);
    const intervalDays = isKnown ? known : Math.floor(known / 2);
    const repetitionCount = isKnown ? card.repetitionCount + 1 : 0;
    const nextReviewAt = now + intervalDays * DAY_MS;
    return { ...card, easeFactor, intervalDays, repetitionCount, nextReviewAt };
  },

  /** Cards whose next review is due at or before `now`. */
  getDueCards<T extends FlashcardSRSState>(cards: readonly T[], now: number = Date.now()): T[] {
    return cards.filter((card) => card.nextReviewAt <= now);
  },
} as const;
