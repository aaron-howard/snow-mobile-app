import type { AnswerChoiceDTO, QuestionDTO } from '@db/repositories/types';

export type SimulatorQuestionRecord = QuestionDTO;
export type SimulatorAnswerChoiceRecord = AnswerChoiceDTO;

export interface SimulatorQuestion {
  question: SimulatorQuestionRecord;
  choices: SimulatorAnswerChoiceRecord[];
}

export type SimulatorState = 'active' | 'paused' | 'submitted' | 'discarded';

export interface SimulatorSession {
  sessionId: string;
  examId: string;
  questions: SimulatorQuestion[];
  /** questionId -> selected answerId. */
  answers: Record<string, string>;
  flaggedQuestions: string[];
  remainingSeconds: number;
  state: SimulatorState;
  expiresAt: number;
}

export interface ConfirmationSummary {
  total: number;
  answered: number;
  unanswered: number;
  flagged: number;
}

export interface DomainScore {
  domainId: string;
  correct: number;
  total: number;
}

export interface IncorrectQuestion {
  questionId: string;
  explanation: string;
}

export interface SimulatorResult {
  sessionId: string;
  correctAnswers: number;
  incorrectAnswers: number;
  scorePercent: number;
  passed: boolean;
  passingThreshold: number;
  domainBreakdown: DomainScore[];
  incorrectQuestions: IncorrectQuestion[];
}
