import type { ConfirmationSummary } from './types';

/** Minimal session shape needed to count answered / flagged questions. */
export interface ConfirmationSummaryInput {
  questions: readonly { question: { id: string } }[];
  answers: Readonly<Record<string, string>>;
  flaggedQuestions: readonly string[];
}

/**
 * Pure pre-submission tally (Requirement 5.5). Returns the exact number of
 * unanswered and flagged questions in the session.
 *
 * A question counts as answered only when a non-empty answer id is recorded for
 * it. Flagged questions are de-duplicated and restricted to the session's own
 * questions so stale ids can never inflate the count.
 */
export function buildConfirmationSummary(input: ConfirmationSummaryInput): ConfirmationSummary {
  const ids = input.questions.map((q) => q.question.id);
  const idSet = new Set(ids);

  const answered = ids.filter((id) => {
    const answer = input.answers[id];
    return typeof answer === 'string' && answer.length > 0;
  }).length;

  const flagged = new Set(input.flaggedQuestions.filter((id) => idSet.has(id))).size;

  return {
    total: ids.length,
    answered,
    unanswered: ids.length - answered,
    flagged,
  };
}
