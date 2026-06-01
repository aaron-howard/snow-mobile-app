import type { DomainScore, IncorrectQuestion, SimulatorResult } from './types';

/** A question reduced to exactly what grading needs (no answer-choice arrays). */
export interface SimulatorGradingQuestion {
  id: string;
  domainId: string;
  explanation: string;
  /** The id of the correct choice, or null if the question has no correct choice. */
  correctAnswerId: string | null;
}

export interface SimulatorGradingInput {
  sessionId: string;
  /** questionId -> selected answerId. */
  answers: Readonly<Record<string, string>>;
  /** Official passing score for the exam (0–100). */
  passingThreshold: number;
}

/**
 * Pure simulator grading (Requirement 5.6).
 *
 * Score is computed over **every presented question**, so an unanswered
 * question counts as incorrect (exam conditions). A question is correct only
 * when the selected answer equals its non-null `correctAnswerId`. The same
 * "not correct" predicate drives the score, the per-domain breakdown, and the
 * incorrect-question list (which therefore includes unanswered questions so the
 * user can review them).
 */
export function calculateSimulatorResult(
  session: SimulatorGradingInput,
  questions: readonly SimulatorGradingQuestion[],
): SimulatorResult {
  let correct = 0;
  const domainMap = new Map<string, { correct: number; total: number }>();
  const incorrectQuestions: IncorrectQuestion[] = [];

  for (const question of questions) {
    const selected = session.answers[question.id];
    const isCorrect = question.correctAnswerId !== null && selected === question.correctAnswerId;

    if (isCorrect) {
      correct += 1;
    } else {
      incorrectQuestions.push({ questionId: question.id, explanation: question.explanation });
    }

    const bucket = domainMap.get(question.domainId) ?? { correct: 0, total: 0 };
    bucket.total += 1;
    if (isCorrect) bucket.correct += 1;
    domainMap.set(question.domainId, bucket);
  }

  const total = questions.length;
  const incorrect = total - correct;
  const scorePercent = total === 0 ? 0 : Math.round((correct / total) * 100);

  const domainBreakdown: DomainScore[] = Array.from(domainMap.entries()).map(
    ([domainId, bucket]) => ({ domainId, correct: bucket.correct, total: bucket.total }),
  );

  return {
    sessionId: session.sessionId,
    correctAnswers: correct,
    incorrectAnswers: incorrect,
    scorePercent,
    passed: scorePercent >= session.passingThreshold,
    passingThreshold: session.passingThreshold,
    domainBreakdown,
    incorrectQuestions,
  };
}
