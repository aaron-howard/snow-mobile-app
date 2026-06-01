import type { QuestionRecord } from './types';

/**
 * Every question — image or not — must carry a non-empty accessible text
 * description for screen readers (Requirement 3.11). Whitespace-only text is
 * treated as empty since it conveys nothing to assistive technology.
 */
export function validateQuestion(question: Pick<QuestionRecord, 'imageAltText'>): boolean {
  return typeof question.imageAltText === 'string' && question.imageAltText.trim().length > 0;
}
