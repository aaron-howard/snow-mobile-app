// Feature: servicenow-cert-study-app, Property 26
//
// Property 26 — High-contrast theme color pairs meet WCAG 2.1 AA contrast ratio:
// every foreground/background pair composited while high-contrast mode is active
// has a contrast ratio of at least 4.5:1.
//
// Validates: Requirements 10.3.

import fc from 'fast-check';
import { highContrastTheme, themeContrastPairs } from '../themes';
import { contrastRatio, WCAG_AA_CONTRAST } from '../contrast';

describe('high-contrast theme — Property 26', () => {
  const pairs = themeContrastPairs(highContrastTheme);

  test('every foreground/background pair clears WCAG AA (≥ 4.5:1)', () => {
    fc.assert(
      fc.property(fc.constantFrom(...pairs), (pair) => contrastRatio(pair.fg, pair.bg) >= WCAG_AA_CONTRAST),
      { numRuns: Math.max(pairs.length * 10, 100) },
    );
  });

  test.each(pairs.map((p) => [p.name, p.fg, p.bg] as const))(
    'pair "%s" meets AA',
    (_name, fg, bg) => {
      expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(WCAG_AA_CONTRAST);
    },
  );
});
