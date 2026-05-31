import { Q } from '@nozbe/watermelondb';
import type { Database } from '@nozbe/watermelondb';
import type { Flashcard } from '../models/Flashcard';
import type { FlashcardDTO, FlashcardRepository } from './types';

export class WatermelonFlashcardRepository implements FlashcardRepository {
  constructor(private readonly db: Database) {}

  async listByDeck(deckId: string): Promise<FlashcardDTO[]> {
    const rows = await this.db
      .get<Flashcard>('flashcards')
      .query(Q.where('deck_id', deckId))
      .fetch();
    return rows.map(toDTO);
  }

  async getById(id: string): Promise<FlashcardDTO | null> {
    try {
      return toDTO(await this.db.get<Flashcard>('flashcards').find(id));
    } catch {
      return null;
    }
  }

  async upsertSRSState(
    id: string,
    state: Pick<
      FlashcardDTO,
      'easeFactor' | 'intervalDays' | 'repetitionCount' | 'nextReviewAt' | 'lastReviewedAt'
    >,
  ): Promise<void> {
    await this.db.write(async () => {
      const row = await this.db.get<Flashcard>('flashcards').find(id);
      await row.update((r) => {
        r.easeFactor = state.easeFactor;
        r.intervalDays = state.intervalDays;
        r.repetitionCount = state.repetitionCount;
        r.nextReviewAt = state.nextReviewAt;
        r.lastReviewedAt = state.lastReviewedAt;
      });
    });
  }

  async createCustom(card: Omit<FlashcardDTO, 'id'>): Promise<FlashcardDTO> {
    let created!: Flashcard;
    await this.db.write(async () => {
      created = await this.db.get<Flashcard>('flashcards').create((row) => {
        row.deckId = card.deckId;
        row.term = card.term;
        row.definition = card.definition;
        row.isCustom = true;
        row.easeFactor = card.easeFactor;
        row.intervalDays = card.intervalDays;
        row.repetitionCount = card.repetitionCount;
        row.nextReviewAt = card.nextReviewAt;
        row.lastReviewedAt = card.lastReviewedAt;
      });
    });
    return toDTO(created);
  }
}

function toDTO(r: Flashcard): FlashcardDTO {
  return {
    id: r.id,
    deckId: r.deckId,
    term: r.term,
    definition: r.definition,
    isCustom: r.isCustom,
    easeFactor: r.easeFactor,
    intervalDays: r.intervalDays,
    repetitionCount: r.repetitionCount,
    nextReviewAt: r.nextReviewAt,
    lastReviewedAt: r.lastReviewedAt,
  };
}
