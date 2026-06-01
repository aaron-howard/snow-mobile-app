import {
  DEFAULT_EASE_FACTOR,
  MIN_EASE_FACTOR,
  SpacedRepetitionEngine,
} from '../SpacedRepetitionEngine';
import type { FlashcardSRSState } from '../types';

const DAY_MS = 24 * 60 * 60 * 1000;

function state(overrides: Partial<FlashcardSRSState> = {}): FlashcardSRSState {
  return {
    easeFactor: DEFAULT_EASE_FACTOR,
    intervalDays: 1,
    repetitionCount: 0,
    nextReviewAt: 0,
    ...overrides,
  };
}

describe('SpacedRepetitionEngine.computeNextInterval', () => {
  test('first Known review schedules 2 days out and advances the repetition count', () => {
    const next = SpacedRepetitionEngine.computeNextInterval(state(), 5, 0);
    expect(next.intervalDays).toBe(2);
    expect(next.repetitionCount).toBe(1);
    expect(next.nextReviewAt).toBe(2 * DAY_MS);
  });

  test('second Known review schedules 6 days out', () => {
    const next = SpacedRepetitionEngine.computeNextInterval(state({ repetitionCount: 1 }), 4, 0);
    expect(next.intervalDays).toBe(6);
    expect(next.repetitionCount).toBe(2);
  });

  test('later Known reviews scale by the ease factor', () => {
    const next = SpacedRepetitionEngine.computeNextInterval(
      state({ repetitionCount: 2, intervalDays: 10, easeFactor: 2.5 }),
      5,
      0,
    );
    expect(next.intervalDays).toBe(25); // round(10 * 2.5)
  });

  test('Still Learning resets the repetition count and uses half the Known interval', () => {
    const card = state({ repetitionCount: 1 }); // known interval would be 6
    const next = SpacedRepetitionEngine.computeNextInterval(card, 0, 0);
    expect(next.repetitionCount).toBe(0);
    expect(next.intervalDays).toBe(3);
  });

  test('ease factor never drops below 1.3 even from the floor with the worst score', () => {
    const next = SpacedRepetitionEngine.computeNextInterval(
      state({ easeFactor: MIN_EASE_FACTOR }),
      0,
      0,
    );
    expect(next.easeFactor).toBeGreaterThanOrEqual(MIN_EASE_FACTOR);
  });
});

describe('SpacedRepetitionEngine.getDueCards', () => {
  test('returns only cards whose next review is at or before now', () => {
    const cards = [
      state({ nextReviewAt: 100 }),
      state({ nextReviewAt: 200 }),
      state({ nextReviewAt: 300 }),
    ];
    const due = SpacedRepetitionEngine.getDueCards(cards, 200);
    expect(due).toHaveLength(2);
    expect(due.every((c) => c.nextReviewAt <= 200)).toBe(true);
  });
});
