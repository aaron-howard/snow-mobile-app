// Sanity test. Confirms Jest + jest-expo are wired up and that
// fast-check is importable for the property tests that arrive in task 3+.

import fc from 'fast-check';

describe('smoke', () => {
  test('jest runs', () => {
    expect(1 + 1).toBe(2);
  });

  test('fast-check runs a tiny property', () => {
    // Identity: reversing twice equals the original.
    fc.assert(
      fc.property(fc.array(fc.integer()), (xs) => {
        const reversed = [...xs].reverse().reverse();
        return reversed.length === xs.length && reversed.every((v, i) => v === xs[i]);
      }),
      { numRuns: 50 },
    );
  });
});
