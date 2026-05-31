import { Model } from '@nozbe/watermelondb';
import { field, text } from '@nozbe/watermelondb/decorators';

export type SimulatorState = 'active' | 'paused' | 'submitted' | 'discarded';

export class SimulatorSession extends Model {
  static table = 'simulator_sessions';

  @text('user_id') userId!: string;
  @text('exam_id') examId!: string;
  @field('started_at') startedAt!: number;
  @field('paused_at') pausedAt!: number | null;
  @field('submitted_at') submittedAt!: number | null;
  @field('expires_at') expiresAt!: number; // started_at + 90d (Req 5.7)
  @field('remaining_seconds') remainingSeconds!: number;
  @text('state') state!: SimulatorState;
  /** JSON: { [questionId: string]: answerId } — serialized at the repository layer. */
  @text('answers_json') answersJson!: string;
  /** JSON: string[] — flagged question IDs. */
  @text('flagged_json') flaggedJson!: string;

  /** Helper to read the answers map safely. */
  get answers(): Record<string, string> {
    try {
      return JSON.parse(this.answersJson) as Record<string, string>;
    } catch {
      return {};
    }
  }

  /** Helper to read the flagged-questions list safely. */
  get flaggedQuestions(): string[] {
    try {
      const parsed = JSON.parse(this.flaggedJson) as unknown;
      return Array.isArray(parsed) ? (parsed as string[]) : [];
    } catch {
      return [];
    }
  }
}
