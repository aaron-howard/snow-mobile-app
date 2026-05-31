import { Q } from '@nozbe/watermelondb';
import type { Database } from '@nozbe/watermelondb';
import type { BlueprintSkill } from '../models/BlueprintSkill';
import type { BlueprintSkillDTO, BlueprintSkillRepository } from './types';

export class WatermelonBlueprintSkillRepository implements BlueprintSkillRepository {
  constructor(private readonly db: Database) {}

  async listByExam(examId: string): Promise<BlueprintSkillDTO[]> {
    const rows = await this.db
      .get<BlueprintSkill>('blueprint_skills')
      .query(Q.where('exam_id', examId))
      .fetch();
    return rows.map(toDTO);
  }

  async getById(id: string): Promise<BlueprintSkillDTO | null> {
    try {
      return toDTO(await this.db.get<BlueprintSkill>('blueprint_skills').find(id));
    } catch {
      return null;
    }
  }
}

function toDTO(r: BlueprintSkill): BlueprintSkillDTO {
  return {
    id: r.id,
    examId: r.examId,
    domainId: r.domainId,
    code: r.code,
    description: r.description,
    blueprintSourceUrl: r.blueprintSourceUrl,
    blueprintRetrievedAt: r.blueprintRetrievedAt,
  };
}
