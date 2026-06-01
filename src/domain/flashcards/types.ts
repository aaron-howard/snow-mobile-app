import type { FlashcardDTO } from '@db/repositories/types';

/** SM-2 response quality: 0–2 = "Still Learning", 3–5 = "Known". */
export type ResponseQuality = 0 | 1 | 2 | 3 | 4 | 5;

/**
 * Minimal SM-2 state the engine operates on. Timestamps are epoch ms to match
 * {@link FlashcardDTO} (the design's `FlashcardSRSState` uses `Date`; we keep
 * numbers to avoid timezone ambiguity and stay aligned with the data layer).
 */
export interface FlashcardSRSState {
  easeFactor: number;
  intervalDays: number;
  repetitionCount: number;
  nextReviewAt: number;
}

export type FlashcardRecord = FlashcardDTO;

export type SwipeOutcome = 'known' | 'still_learning';

export interface FlashcardSessionSummary {
  known: number;
  stillLearning: number;
}
