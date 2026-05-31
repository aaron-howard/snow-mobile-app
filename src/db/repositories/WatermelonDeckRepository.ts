import { Q } from '@nozbe/watermelondb';
import type { Database } from '@nozbe/watermelondb';
import type { Deck } from '../models/Deck';
import type { DeckDTO, DeckRepository } from './types';

export class WatermelonDeckRepository implements DeckRepository {
  constructor(private readonly db: Database) {}

  async listByExam(examId: string): Promise<DeckDTO[]> {
    const rows = await this.db
      .get<Deck>('decks')
      .query(Q.where('exam_id', examId))
      .fetch();
    return rows.map(toDTO);
  }

  async getById(id: string): Promise<DeckDTO | null> {
    try {
      return toDTO(await this.db.get<Deck>('decks').find(id));
    } catch {
      return null;
    }
  }

  async createCustom(deck: Omit<DeckDTO, 'id'>): Promise<DeckDTO> {
    let created!: Deck;
    await this.db.write(async () => {
      created = await this.db.get<Deck>('decks').create((row) => {
        row.examId = deck.examId;
        row.domainId = deck.domainId;
        row.name = deck.name;
        row.isCustom = true;
      });
    });
    return toDTO(created);
  }
}

function toDTO(r: Deck): DeckDTO {
  return {
    id: r.id,
    examId: r.examId,
    domainId: r.domainId,
    name: r.name,
    isCustom: r.isCustom,
  };
}
