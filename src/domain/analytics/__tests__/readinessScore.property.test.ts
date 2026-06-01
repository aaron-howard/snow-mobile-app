// Feature: servicenow-cert-study-app, Property 15
//
// Property 15 — Readiness score is bounded in [0, 100] and ignores sessions
// older than 30 days.
//
// For any sessions (including ones older than 30 days) and any domain weights,
// the score SHALL be within [0, 100] and SHALL equal the score computed using
// only sessions completed within the last 30 days.
//
// Validates: Requirements 6.4, 6.5.

import fc from 'fast-check';
import { READINESS_WINDOW_MS, ReadinessScoreCalculator } from '../ReadinessScoreCalculator';
import type { DomainWeight, StudySessionScore } from '../types';

const NOW = 1_700_000_000_000;

const sessionArb: fc.Arbitrary<StudySessionScore> = fc.record({
  domainId: fc.constantFrom('d1', 'd2', 'd3'),
  score: fc.integer({ min: 0, max: 100 }),
  // Spread completion times from ~60 days ago to now.
  completedAt: fc.integer({ min: NOW - 60 * 24 * 60 * 60 * 1000, max: NOW }),
  sessionType: fc.constantFrom<'quiz' | 'simulator'>('quiz', 'simulator'),
});

const weightsArb: fc.Arbitrary<DomainWeight[]> = fc.subarray(
  [
    { domainId: 'd1', weightPercent: 50 },
    { domainId: 'd2', weightPercent: 30 },
    { domainId: 'd3', weightPercent: 20 },
  ],
  { minLength: 0, maxLength: 3 },
);

describe('ReadinessScoreCalculator.calculate — Property 15', () => {
  test('result is in [0,100] and ignores sessions older than 30 days', () => {
    fc.assert(
      fc.property(
        fc.array(sessionArb, { maxLength: 60 }),
        weightsArb,
        (sessions, weights) => {
          const score = ReadinessScoreCalculator.calculate(sessions, weights, NOW);

          if (score < 0 || score > 100) return false;

          const recentOnly = sessions.filter(
            (s) => s.completedAt >= NOW - READINESS_WINDOW_MS,
          );
          const recentScore = ReadinessScoreCalculator.calculate(recentOnly, weights, NOW);
          return score === recentScore;
        },
      ),
      { numRuns: 300 },
    );
  });

  test('returns 0 when there are no recent sessions', () => {
    const old: StudySessionScore = {
      domainId: 'd1',
      score: 100,
      completedAt: NOW - READINESS_WINDOW_MS - 1,
      sessionType: 'quiz',
    };
    expect(ReadinessScoreCalculator.calculate([old], [{ domainId: 'd1', weightPercent: 100 }], NOW)).toBe(0);
  });
});
