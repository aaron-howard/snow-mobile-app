/** A question being answered, carrying the one-or-more domain tags it belongs to. */
export interface AnsweredQuestion {
  id: string;
  /** Every topic-domain tag on the question (Req 3.4). */
  domainIds: readonly string[];
}

export interface SubmittedAnswer {
  id: string;
  isCorrect: boolean;
}

export interface AttemptAttribution {
  questionId: string;
  domainId: string;
  answerId: string;
  isCorrect: boolean;
}

/**
 * Attribute a quiz answer to *every* topic domain tagged on the question
 * (Requirement 3.4) so the Progress_Tracker can credit each domain — never a
 * subset. Duplicate domain tags are de-duplicated; a question with no domains
 * produces no attributions.
 */
export function recordAttempt(
  question: AnsweredQuestion,
  answer: SubmittedAnswer,
): AttemptAttribution[] {
  const seen = new Set<string>();
  const attributions: AttemptAttribution[] = [];
  for (const domainId of question.domainIds) {
    if (seen.has(domainId)) continue;
    seen.add(domainId);
    attributions.push({
      questionId: question.id,
      domainId,
      answerId: answer.id,
      isCorrect: answer.isCorrect,
    });
  }
  return attributions;
}
