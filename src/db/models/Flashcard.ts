import { Model, type Relation } from '@nozbe/watermelondb';
import { field, immutableRelation, text } from '@nozbe/watermelondb/decorators';
import type { Deck } from './Deck';

export class Flashcard extends Model {
  static table = 'flashcards';
  static associations = {
    decks: { type: 'belongs_to' as const, key: 'deck_id' },
  };

  @text('deck_id') deckId!: string;
  @text('term') term!: string;
  @text('definition') definition!: string;
  @field('is_custom') isCustom!: boolean;

  // SM-2 state. Constraints enforced in domain layer (SpacedRepetitionEngine).
  @field('ease_factor') easeFactor!: number; // ≥ 1.3
  @field('interval_days') intervalDays!: number;
  @field('repetition_count') repetitionCount!: number;
  @field('next_review_at') nextReviewAt!: number;
  @field('last_reviewed_at') lastReviewedAt!: number | null;

  @immutableRelation('decks', 'deck_id') deck!: Relation<Deck>;
}
