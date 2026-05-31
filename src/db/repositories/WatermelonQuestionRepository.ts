import { Q } from '@nozbe/watermelondb';
import type { Database } from '@nozbe/watermelondb';
import type { Question } from '../models/Question';
import type { QuestionDTO, QuestionRepository, UserQuestionAttemptRepository } from './types';

/**
 * WatermelonDB-backed QuestionRepository.
 *
 * The pool-for-session method enforces Property 27: only questions with
 * `review_status = 'published'` and a non-empty `blueprint_skill_id` are
 * ever returned to the UI/domain layers. This is enforced in the data
 * layer (not the domain layer) so it is impossible to bypass.
 */
export class WatermelonQuestionRepository implements QuestionRepository {
  constructor(
    private readonly db: Database,
    private readonly attempts: UserQuestionAttemptRepository,
  ) {}

  async countPublishedForExam(examId: string): Promise<number> {
    return this.db
      .get<Question>('questions')
      .query(
        Q.where('exam_id', examId),
        Q.where('review_status', 'published'),
        Q.where('blueprint_skill_id', Q.notEq('')),
      )
      .fetchCount();
  }

  async getPoolForSession(examId: string, domainId?: string): Promise<QuestionDTO[]> {
    const conditions = [
      Q.where('exam_id', examId),
      Q.where('review_status', 'published'),
      // Property 27: blueprint_skill_id must be non-empty.
      Q.where('blueprint_skill_id', Q.notEq('')),
    ];
    if (domainId) conditions.push(Q.where('domain_id', domainId));

    const rows = await this.db
      .get<Question>('questions')
      .query(...conditions)
      .fetch();

    return rows.map(toDTO);
  }

  async getById(id: string): Promise<QuestionDTO | null> {
    try {
      const row = await this.db.get<Question>('questions').find(id);
      // Property 27 guard on direct fetch too.
      if (row.reviewStatus !== 'published' || !row.blueprintSkillId) {
        return null;
      }
      return toDTO(row);
    } catch {
      return null;
    }
  }

  async getReviewQueue(userId: string, examId: string): Promise<QuestionDTO[]> {
    // Count incorrect attempts per question, then return the matching
    // published questions in descending order of that count.
    const incorrectCounts = await this.attempts.countIncorrectByQuestion(userId, examId);
    if (incorrectCounts.size === 0) return [];

    const questionIds = Array.from(incorrectCounts.keys());
    const rows = await this.db
      .get<Question>('questions')
      .query(
        Q.where('id', Q.oneOf(questionIds)),
        Q.where('review_status', 'published'),
        Q.where('blueprint_skill_id', Q.notEq('')),
      )
      .fetch();

    return rows
      .map(toDTO)
      .sort((a, b) => (incorrectCounts.get(b.id) ?? 0) - (incorrectCounts.get(a.id) ?? 0));
  }

  async incrementAttemptCounters(id: string, wasCorrect: boolean): Promise<void> {
    await this.db.write(async () => {
      const row = await this.db.get<Question>('questions').find(id);
      await row.update((q) => {
        q.timesAnswered = q.timesAnswered + 1;
        if (wasCorrect) q.timesAnsweredCorrectly = q.timesAnsweredCorrectly + 1;
        q.isPoolReset = false;
      });
    });
  }

  async resetPool(examId: string): Promise<void> {
    await this.db.write(async () => {
      const rows = await this.db
        .get<Question>('questions')
        .query(Q.where('exam_id', examId), Q.where('review_status', 'published'))
        .fetch();
      const updates = rows.map((row) =>
        row.prepareUpdate((q) => {
          q.isPoolReset = true;
        }),
      );
      await this.db.batch(...updates);
    });
  }
}

function toDTO(row: Question): QuestionDTO {
  return {
    id: row.id,
    examId: row.examId,
    domainId: row.domainId,
    blueprintSkillId: row.blueprintSkillId,
    text: row.text,
    imageUrl: row.imageUrl,
    imageAltText: row.imageAltText,
    explanation: row.explanation,
    difficultyLevel: row.difficultyLevel,
    bloomsLevel: row.bloomsLevel,
    authorId: row.authorId,
    sourceNotes: row.sourceNotes,
    reviewStatus: row.reviewStatus,
    reviewedBy: row.reviewedBy,
    reviewedAt: row.reviewedAt,
    publishedAt: row.publishedAt,
    timesAnswered: row.timesAnswered,
    timesAnsweredCorrectly: row.timesAnsweredCorrectly,
    isPoolReset: row.isPoolReset,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
