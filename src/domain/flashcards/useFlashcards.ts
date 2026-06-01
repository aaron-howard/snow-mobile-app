import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRepositories } from '@db/repositories';
import type { DeckDTO } from '@db/repositories/types';
import { FlashcardSessionManager } from './FlashcardSessionManager';
import { DEFAULT_EASE_FACTOR, SpacedRepetitionEngine } from './SpacedRepetitionEngine';
import { validateFlashcard } from './validateFlashcard';
import type { FlashcardRecord, FlashcardSessionSummary, ResponseQuality } from './types';

/** Swipe→quality mapping for SM-2 (Known = strong recall, Still Learning = weak). */
const KNOWN_QUALITY: ResponseQuality = 5;
const STILL_LEARNING_QUALITY: ResponseQuality = 1;
const CUSTOM_DECK_NAME = 'My cards';

export interface UseFlashcardsResult {
  loading: boolean;
  error: string | null;
  decks: DeckDTO[];
  selectedDeckId: string | null;
  selectDeck: (deckId: string) => void;
  /** The card currently at the front of the active pool, or null when finished/empty. */
  currentCard: FlashcardRecord | null;
  remaining: number;
  knownCount: number;
  stillLearningCount: number;
  /** Set once the active pool empties or the user ends the session. */
  summary: FlashcardSessionSummary | null;
  swipeKnown: () => Promise<void>;
  swipeStillLearning: () => Promise<void>;
  endSession: () => void;
  createCustomCard: (term: string, definition: string) => Promise<boolean>;
  creating: boolean;
  createError: string | null;
}

export function useFlashcards(examId: string | undefined): UseFlashcardsResult {
  const repos = useMemo(() => createRepositories(), []);
  const now = useCallback(() => Date.now(), []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [decks, setDecks] = useState<DeckDTO[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);

  const [pool, setPool] = useState<FlashcardRecord[]>([]);
  const outcomes = useRef<Map<string, 'known' | 'still_learning'>>(new Map());
  const [knownCount, setKnownCount] = useState(0);
  const [stillLearningCount, setStillLearningCount] = useState(0);
  const [summary, setSummary] = useState<FlashcardSessionSummary | null>(null);

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    if (!examId) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const deckList = await repos.decks.listByExam(examId);
        if (cancelled) return;
        setDecks(deckList);
        setSelectedDeckId((prev) => prev ?? deckList[0]?.id ?? null);
      } catch {
        if (!cancelled) setError('Could not load flashcard decks. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [examId, repos]);

  const recomputeCounts = useCallback(() => {
    let known = 0;
    let still = 0;
    for (const outcome of outcomes.current.values()) {
      if (outcome === 'known') known += 1;
      else still += 1;
    }
    setKnownCount(known);
    setStillLearningCount(still);
  }, []);

  useEffect(() => {
    if (!selectedDeckId) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      outcomes.current = new Map();
      setSummary(null);
      setKnownCount(0);
      setStillLearningCount(0);
      try {
        const cards = await repos.flashcards.listByDeck(selectedDeckId);
        if (!cancelled) setPool(cards);
      } catch {
        if (!cancelled) setError('Could not load flashcards for this deck.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedDeckId, repos]);

  const persistSRS = useCallback(
    async (card: FlashcardRecord, quality: ResponseQuality) => {
      const next = SpacedRepetitionEngine.computeNextInterval(card, quality, now());
      await repos.flashcards.upsertSRSState(card.id, {
        easeFactor: next.easeFactor,
        intervalDays: next.intervalDays,
        repetitionCount: next.repetitionCount,
        nextReviewAt: next.nextReviewAt,
        lastReviewedAt: now(),
      });
    },
    [repos, now],
  );

  const finishIfEmpty = useCallback(
    (nextPool: FlashcardRecord[]) => {
      if (nextPool.length === 0) {
        let known = 0;
        let still = 0;
        for (const outcome of outcomes.current.values()) {
          if (outcome === 'known') known += 1;
          else still += 1;
        }
        setSummary({ known, stillLearning: still });
      }
    },
    [],
  );

  const swipeKnown = useCallback(async () => {
    const card = pool[0];
    if (!card) return;
    outcomes.current.set(card.id, 'known');
    recomputeCounts();
    try {
      await persistSRS(card, KNOWN_QUALITY);
    } catch {
      setError('Could not save your progress for that card.');
    }
    const nextPool = FlashcardSessionManager.swipeRight(pool, 0);
    setPool(nextPool);
    finishIfEmpty(nextPool);
  }, [pool, persistSRS, recomputeCounts, finishIfEmpty]);

  const swipeStillLearning = useCallback(async () => {
    const card = pool[0];
    if (!card) return;
    if (outcomes.current.get(card.id) !== 'known') {
      outcomes.current.set(card.id, 'still_learning');
    }
    recomputeCounts();
    try {
      await persistSRS(card, STILL_LEARNING_QUALITY);
    } catch {
      setError('Could not save your progress for that card.');
    }
    // Re-insert at least 3 positions ahead (Req 4.6).
    setPool((prev) => FlashcardSessionManager.swipeLeft(prev, 0));
  }, [pool, persistSRS, recomputeCounts]);

  const endSession = useCallback(() => {
    // Cards still in the pool that aren't yet known count as still learning.
    for (const card of pool) {
      if (outcomes.current.get(card.id) !== 'known') {
        outcomes.current.set(card.id, 'still_learning');
      }
    }
    let known = 0;
    let still = 0;
    for (const outcome of outcomes.current.values()) {
      if (outcome === 'known') known += 1;
      else still += 1;
    }
    setPool([]);
    setSummary({ known, stillLearning: still });
  }, [pool]);

  const selectDeck = useCallback((deckId: string) => {
    setSelectedDeckId(deckId);
  }, []);

  const createCustomCard = useCallback(
    async (term: string, definition: string): Promise<boolean> => {
      setCreateError(null);
      if (!validateFlashcard(term, definition)) {
        setCreateError(
          term.trim().length === 0
            ? 'Term cannot be empty.'
            : 'Definition cannot be empty.',
        );
        return false;
      }
      if (!examId) return false;

      setCreating(true);
      try {
        const existingCustom = decks.find((d) => d.isCustom);
        const deck =
          existingCustom ??
          (await repos.decks.createCustom({
            examId,
            domainId: null,
            name: CUSTOM_DECK_NAME,
            isCustom: true,
          }));
        if (!existingCustom) {
          setDecks((prev) => [...prev, deck]);
        }

        await repos.flashcards.createCustom({
          deckId: deck.id,
          term: term.trim(),
          definition: definition.trim(),
          isCustom: true,
          easeFactor: DEFAULT_EASE_FACTOR,
          intervalDays: 1,
          repetitionCount: 0,
          nextReviewAt: now(),
          lastReviewedAt: null,
        });
        return true;
      } catch {
        setCreateError('Could not save the flashcard. Please try again.');
        return false;
      } finally {
        setCreating(false);
      }
    },
    [decks, examId, repos, now],
  );

  return {
    loading,
    error,
    decks,
    selectedDeckId,
    selectDeck,
    currentCard: pool[0] ?? null,
    remaining: pool.length,
    knownCount,
    stillLearningCount,
    summary,
    swipeKnown,
    swipeStillLearning,
    endSession,
    createCustomCard,
    creating,
    createError,
  };
}
