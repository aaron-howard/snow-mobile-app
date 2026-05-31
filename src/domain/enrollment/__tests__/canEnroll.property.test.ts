// Feature: servicenow-cert-study-app, Property 3
//
// Property 3 — Enrollment limit enforced at 5 active exams.
//
// For any list of active exam IDs, canEnroll SHALL be true if and only if
// the list length is strictly less than 5.
//
// Validates: Requirements 2.6.

import fc from 'fast-check';
import { EnrollmentGuard } from '../EnrollmentGuard';

describe('EnrollmentGuard.canEnroll — Property 3', () => {
  test('true iff fewer than 5 active exams', () => {
    fc.assert(
      fc.property(fc.array(fc.string(), { maxLength: 10 }), (activeExamIds) => {
        const expected = activeExamIds.length < 5;
        return EnrollmentGuard.canEnroll(activeExamIds) === expected;
      }),
      { numRuns: 200 },
    );
  });

  test('boundary: 4 active — may enroll', () => {
    expect(EnrollmentGuard.canEnroll(['a', 'b', 'c', 'd'])).toBe(true);
  });

  test('boundary: 5 active — may not enroll', () => {
    expect(EnrollmentGuard.canEnroll(['a', 'b', 'c', 'd', 'e'])).toBe(false);
  });

  test('boundary: 0 active — may enroll', () => {
    expect(EnrollmentGuard.canEnroll([])).toBe(true);
  });
});
