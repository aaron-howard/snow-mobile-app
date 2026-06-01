export { buildConfirmationSummary } from './buildConfirmationSummary';
export type { ConfirmationSummaryInput } from './buildConfirmationSummary';
export { calculateSimulatorResult } from './calculateSimulatorResult';
export type {
  SimulatorGradingInput,
  SimulatorGradingQuestion,
} from './calculateSimulatorResult';
export {
  ExamSimulatorController,
  SimulatorRestoreError,
  SIMULATOR_RETENTION_MS,
} from './ExamSimulatorController';
export type { ExamSimulatorControllerDeps } from './ExamSimulatorController';
export type {
  ConfirmationSummary,
  DomainScore,
  IncorrectQuestion,
  SimulatorAnswerChoiceRecord,
  SimulatorQuestion,
  SimulatorQuestionRecord,
  SimulatorResult,
  SimulatorSession,
  SimulatorState,
} from './types';
