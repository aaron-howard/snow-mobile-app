// Feature: servicenow-cert-study-app, Property 9
//
// Property 9 — Custom flashcard validation rejects empty or whitespace-only
// fields.
//
// For any term/definition pair, `validateFlashcard` SHALL return true iff both
// fields contain at least one non-whitespace character.
//
// Validates: Requirements 4.10.

import fc from 'fast-check';
import { validateFlashcard } from '../validateFlashcard';

const whitespaceArb = fc.stringOf(fc.constantFrom(' ', '\t', '\n', '\r'), { maxLength: 6 });
const fieldArb = fc.oneof(fc.string(), whitespaceArb);

describe('validateFlashcard — Property 9', () => {
  test('valid iff both fields have a non-whitespace character', () => {
    fc.assert(
      fc.property(fieldArb, fieldArb, (term, definition) => {
        const expected = term.trim().length > 0 && definition.trim().length > 0;
        return validateFlashcard(term, definition) === expected;
      }),
      { numRuns: 300 },
    );
  });

  test('rejects when either field is empty or whitespace-only', () => {
    expect(validateFlashcard('', 'def')).toBe(false);
    expect(validateFlashcard('term', '   ')).toBe(false);
    expect(validateFlashcard('  ', '  ')).toBe(false);
    expect(validateFlashcard('\t\n', 'def')).toBe(false);
  });

  test('accepts when both fields have content', () => {
    expect(validateFlashcard('GlideRecord', 'Server-side database API')).toBe(true);
  });
});
