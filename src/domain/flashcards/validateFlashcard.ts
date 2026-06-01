/**
 * A custom flashcard is valid only when both the term and definition contain a
 * non-whitespace character (Requirement 4.10). Whitespace-only input is treated
 * as empty so the UI can flag the offending field.
 */
export function validateFlashcard(term: string, definition: string): boolean {
  return isNonEmpty(term) && isNonEmpty(definition);
}

function isNonEmpty(value: string): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}
