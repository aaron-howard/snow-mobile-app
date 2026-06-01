// Feature: servicenow-cert-study-app, Property 8
//
// Property 8 — Every question has a non-empty accessible text description.
//
// For any question (image or not), `validateQuestion` SHALL return true iff the
// accessible `imageAltText` description has at least one non-whitespace
// character.
//
// Validates: Requirements 3.11.

import fc from 'fast-check';
import { validateQuestion } from '../validateQuestion';

describe('validateQuestion — Property 8', () => {
  test('valid iff imageAltText has a non-whitespace character', () => {
    fc.assert(
      fc.property(fc.string(), (imageAltText) => {
        const expected = imageAltText.trim().length > 0;
        return validateQuestion({ imageAltText }) === expected;
      }),
      { numRuns: 200 },
    );
  });

  test('rejects empty and whitespace-only descriptions', () => {
    expect(validateQuestion({ imageAltText: '' })).toBe(false);
    expect(validateQuestion({ imageAltText: '   ' })).toBe(false);
    expect(validateQuestion({ imageAltText: '\t\n ' })).toBe(false);
  });

  test('accepts non-empty descriptions, including image-less questions', () => {
    expect(validateQuestion({ imageAltText: 'Diagram of a flow' })).toBe(true);
    expect(validateQuestion({ imageAltText: 'A' })).toBe(true);
  });
});
