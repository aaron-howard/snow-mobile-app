import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ examId: 'exam-1' }),
}));

const mockUseFlashcards = jest.fn();
jest.mock('@domain/flashcards/useFlashcards', () => ({
  useFlashcards: (...args: unknown[]) => mockUseFlashcards(...args),
}));

import FlashcardsScreen from '../../../app/exam/[examId]/flashcards';
import type { UseFlashcardsResult } from '@domain/flashcards/useFlashcards';
import type { FlashcardRecord } from '@domain/flashcards';

const card: FlashcardRecord = {
  id: 'fc1',
  deckId: 'deck-1',
  term: 'GlideRecord',
  definition: 'Server-side database API',
  isCustom: false,
  easeFactor: 2.5,
  intervalDays: 1,
  repetitionCount: 0,
  nextReviewAt: 0,
  lastReviewedAt: null,
};

function baseState(): UseFlashcardsResult {
  return {
    loading: false,
    error: null,
    decks: [{ id: 'deck-1', examId: 'exam-1', domainId: null, name: 'Core', isCustom: false }],
    selectedDeckId: 'deck-1',
    selectDeck: jest.fn(),
    currentCard: card,
    remaining: 1,
    knownCount: 0,
    stillLearningCount: 0,
    summary: null,
    swipeKnown: jest.fn().mockResolvedValue(undefined),
    swipeStillLearning: jest.fn().mockResolvedValue(undefined),
    endSession: jest.fn(),
    createCustomCard: jest.fn().mockResolvedValue(true),
    creating: false,
    createError: null,
  };
}

function setup(overrides: Partial<UseFlashcardsResult> = {}) {
  const state: UseFlashcardsResult = { ...baseState(), ...overrides };
  mockUseFlashcards.mockReturnValue(state);
  return state;
}

describe('FlashcardsScreen', () => {
  beforeEach(() => {
    mockUseFlashcards.mockReset();
    setup();
  });

  test('renders the heading and current card term', () => {
    const { getByRole, getByText } = render(<FlashcardsScreen />);
    expect(getByRole('header', { name: 'Flashcards' })).toBeTruthy();
    expect(getByText('GlideRecord')).toBeTruthy();
  });

  test('shows a loading spinner while decks load', () => {
    setup({ loading: true });
    const { getByLabelText } = render(<FlashcardsScreen />);
    expect(getByLabelText('Loading flashcards')).toBeTruthy();
  });

  test('renders the session summary with Known and Still Learning counts (Req 4.7)', () => {
    setup({ summary: { known: 5, stillLearning: 2 } });
    const { getByLabelText } = render(<FlashcardsScreen />);
    expect(getByLabelText('5 known')).toBeTruthy();
    expect(getByLabelText('2 still learning')).toBeTruthy();
  });

  test('opening the add form and saving a valid card calls createCustomCard', async () => {
    const createCustomCard = jest.fn().mockResolvedValue(true);
    setup({ createCustomCard });
    const { getByLabelText } = render(<FlashcardsScreen />);

    fireEvent.press(getByLabelText('Add a custom flashcard'));
    fireEvent.changeText(getByLabelText('Flashcard term'), 'Business Rule');
    fireEvent.changeText(getByLabelText('Flashcard definition'), 'Runs server-side');
    fireEvent.press(getByLabelText('Save flashcard'));

    await waitFor(() => {
      expect(createCustomCard).toHaveBeenCalledWith('Business Rule', 'Runs server-side');
    });
  });

  test('surfaces a validation error from the hook (Req 4.10)', () => {
    setup({ createError: 'Term cannot be empty.' });
    const { getByLabelText, getByText } = render(<FlashcardsScreen />);
    fireEvent.press(getByLabelText('Add a custom flashcard'));
    expect(getByText('Term cannot be empty.')).toBeTruthy();
  });

  test('Known action triggers the swipe handler', () => {
    const swipeKnown = jest.fn().mockResolvedValue(undefined);
    setup({ swipeKnown });
    const { getByLabelText } = render(<FlashcardsScreen />);
    fireEvent.press(getByLabelText('Mark known'));
    expect(swipeKnown).toHaveBeenCalled();
  });
});
