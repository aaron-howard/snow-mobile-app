import { ReadinessScoreCalculator } from '../ReadinessScoreCalculator';
import type { DomainWeight, StudySessionScore } from '../types';

const NOW = 1_700_000_000_000;

function recent(domainId: string, score: number): StudySessionScore {
  return { domainId, score, completedAt: NOW - 1000, sessionType: 'quiz' };
}

describe('ReadinessScoreCalculator.calculate', () => {
  test('weights domain averages by importance', () => {
    const weights: DomainWeight[] = [
      { domainId: 'd1', weightPercent: 75 },
      { domainId: 'd2', weightPercent: 25 },
    ];
    // d1 avg 80, d2 avg 40 -> 0.75*80 + 0.25*40 = 70
    const sessions = [recent('d1', 80), recent('d2', 40)];
    expect(ReadinessScoreCalculator.calculate(sessions, weights, NOW)).toBe(70);
  });

  test('averages multiple sessions within the same domain', () => {
    const weights: DomainWeight[] = [{ domainId: 'd1', weightPercent: 100 }];
    const sessions = [recent('d1', 60), recent('d1', 100)];
    expect(ReadinessScoreCalculator.calculate(sessions, weights, NOW)).toBe(80);
  });

  test('caps the result at 100', () => {
    const weights: DomainWeight[] = [{ domainId: 'd1', weightPercent: 100 }];
    const sessions = [recent('d1', 150)];
    expect(ReadinessScoreCalculator.calculate(sessions, weights, NOW)).toBe(100);
  });

  test('falls back to an unweighted average when no weights match', () => {
    const sessions = [recent('d1', 40), recent('d2', 60)];
    expect(ReadinessScoreCalculator.calculate(sessions, [], NOW)).toBe(50);
  });

  test('returns 0 with no sessions', () => {
    expect(ReadinessScoreCalculator.calculate([], [{ domainId: 'd1', weightPercent: 100 }], NOW)).toBe(0);
  });
});
