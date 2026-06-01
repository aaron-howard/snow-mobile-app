import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { FlashcardDeck, FLIP_DURATION_MS } from '../FlashcardDeck';
import type { FlashcardRecord } from '@domain/flashcards';

const card: FlashcardRecord = {
  id: 'fc1',
  deckId: 'deck-1',
  term: 'GlideRecord',
  definition: 'Server-side API for database operations',
  isCustom: false,
  easeFactor: 2.5,
  intervalDays: 1,
  repetitionCount: 0,
  nextReviewAt: 0,
  lastReviewedAt: null,
};

describe('FlashcardDeck', () => {
  test('flip animation duration meets the 300 ms budget (Req 4.4)', () => {
    expect(FLIP_DURATION_MS).toBeLessThanOrEqual(300);
  });

  test('shows the empty-deck message and create option when there is no card (Req 4.3)', () => {
    const onCreateRequest = jest.fn();
    const { getByText, getByLabelText } = render(
      <FlashcardDeck
        card={null}
        onSwipeKnown={() => {}}
        onSwipeStillLearning={() => {}}
        onCreateRequest={onCreateRequest}
      />,
    );
    expect(getByText('This deck has no flashcards yet.')).toBeTruthy();
    fireEvent.press(getByLabelText('Create a flashcard'));
    expect(onCreateRequest).toHaveBeenCalled();
  });

  test('shows the term by default and flips to the definition on tap (Req 4.2)', () => {
    const { getByText, getByLabelText, queryByText } = render(
      <FlashcardDeck card={card} onSwipeKnown={() => {}} onSwipeStillLearning={() => {}} />,
    );
    expect(getByText('GlideRecord')).toBeTruthy();
    expect(queryByText('Server-side API for database operations')).toBeNull();

    fireEvent.press(getByLabelText(/^Term: GlideRecord/));
    expect(getByText('Server-side API for database operations')).toBeTruthy();
  });

  test('Known button marks the card known (Req 4.5)', () => {
    const onSwipeKnown = jest.fn();
    const { getByLabelText } = render(
      <FlashcardDeck card={card} onSwipeKnown={onSwipeKnown} onSwipeStillLearning={() => {}} />,
    );
    fireEvent.press(getByLabelText('Mark known'));
    expect(onSwipeKnown).toHaveBeenCalled();
  });

  test('Still learning button re-queues the card (Req 4.6)', () => {
    const onSwipeStillLearning = jest.fn();
    const { getByLabelText } = render(
      <FlashcardDeck card={card} onSwipeKnown={() => {}} onSwipeStillLearning={onSwipeStillLearning} />,
    );
    fireEvent.press(getByLabelText('Mark still learning'));
    expect(onSwipeStillLearning).toHaveBeenCalled();
  });
});
