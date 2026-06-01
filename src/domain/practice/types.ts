import type { AnswerChoiceDTO, QuestionDTO } from '@db/repositories/types';

/** A practice question (alias of the repository DTO — one domain per question in the schema). */
export type QuestionRecord = QuestionDTO;
export type AnswerChoiceRecord = AnswerChoiceDTO;

/** A question paired with its answer choices, ready to render in a quiz. */
export interface QuizQuestion {
  question: QuestionRecord;
  choices: AnswerChoiceRecord[];
}

export interface QuizSession {
  /** Backing `study_sessions` row id; used to complete the session. */
  sessionId: string;
  examId: string;
  /** Selected topic-domain filter, or null when studying the whole pool. */
  domainFilter: string | null;
  isBookmarkSession: boolean;
  questions: QuizQuestion[];
  /** True when the pool was exhausted and reset for this session (Req 3.8, 3.9). */
  poolWasReset: boolean;
}

export interface AnswerResult {
  questionId: string;
  selectedAnswerId: string;
  isCorrect: boolean;
  correctAnswerId: string;
  explanation: string;
}

export interface DomainScore {
  domainId: string;
  correct: number;
  total: number;
}

export interface SessionSummary {
  sessionId: string;
  correctAnswers: number;
  incorrectAnswers: number;
  scorePercent: number;
  domainBreakdown: DomainScore[];
  poolWasReset: boolean;
}
