// Feature: servicenow-cert-study-app, Property 1
//
// Property 1 — Password length validation accepts and rejects correct ranges.
//
// For any string, the password validation function SHALL return valid
// if and only if the string's length is between 8 and 128 characters
// (inclusive); it SHALL return invalid for any string shorter than 8
// or longer than 128 characters.
//
// Validates: Requirements 1.3.

import fc from 'fast-check';
import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  validatePassword,
} from '../validatePassword';

describe('validatePassword — Property 1', () => {
  test('valid iff length in [MIN, MAX] inclusive', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 200 }), (s) => {
        const lengthInRange =
          s.length >= MIN_PASSWORD_LENGTH && s.length <= MAX_PASSWORD_LENGTH;
        return validatePassword(s) === lengthInRange;
      }),
      // Spec calls for ≥100 iterations; bump to 200 to cover both sides of
      // each boundary comfortably.
      { numRuns: 200 },
    );
  });

  // Explicit boundary cases — caught by the property test in theory, but
  // explicit assertions make a regression at exactly 7/8/128/129 obvious.
  test('rejects strings shorter than 8 characters', () => {
    for (let len = 0; len < MIN_PASSWORD_LENGTH; len++) {
      expect(validatePassword('x'.repeat(len))).toBe(false);
    }
  });

  test('accepts strings of exactly 8 characters', () => {
    expect(validatePassword('x'.repeat(MIN_PASSWORD_LENGTH))).toBe(true);
  });

  test('accepts strings of exactly 128 characters', () => {
    expect(validatePassword('x'.repeat(MAX_PASSWORD_LENGTH))).toBe(true);
  });

  test('rejects strings longer than 128 characters', () => {
    expect(validatePassword('x'.repeat(MAX_PASSWORD_LENGTH + 1))).toBe(false);
    expect(validatePassword('x'.repeat(500))).toBe(false);
  });
});
