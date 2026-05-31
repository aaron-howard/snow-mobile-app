import type { QuestionRecord } from './types';

/**
 * Return only questions belonging to the given topic domain.
 * The Watermelon schema stores a single `domain_id` per question.
 */
export function filterByDomain(
  questions: readonly QuestionRecord[],
  domainId: string,
): QuestionRecord[] {
  return questions.filter((q) => q.domainId === domainId);
}
