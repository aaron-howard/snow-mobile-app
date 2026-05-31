import { Model, type Query } from '@nozbe/watermelondb';
import { children, field, text } from '@nozbe/watermelondb/decorators';
import type { Flashcard } from './Flashcard';

export class Deck extends Model {
  static table = 'decks';
  static associations = {
    flashcards: { type: 'has_many' as const, foreignKey: 'deck_id' },
  };

  @text('exam_id') examId!: string;
  @text('domain_id') domainId!: string | null;
  @text('name') name!: string;
  @field('is_custom') isCustom!: boolean;

  @children('flashcards') flashcards!: Query<Flashcard>;
}
