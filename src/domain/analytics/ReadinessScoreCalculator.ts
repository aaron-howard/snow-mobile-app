import type { DomainWeight, StudySessionScore } from './types';

/** Readiness only considers sessions completed within the last 30 days (Req 6.4). */
export const READINESS_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Pure readiness-score calculation (Requirements 6.4, 6.5).
 *
 * Considers only sessions completed within the last 30 days, averages each
 * domain's recent scores, then combines those domain averages weighted by
 * domain importance. The result is always clamped to [0, 100] (Req 6.5). With
 * no recent sessions the score is 0. When none of the scored domains carry a
 * positive weight, an unweighted average of the recent domain averages is used
 * so a score is still produced.
 */
export const ReadinessScoreCalculator = {
  calculate(
    sessions: readonly StudySessionScore[],
    domainWeights: readonly DomainWeight[],
    now: number = Date.now(),
  ): number {
    const cutoff = now - READINESS_WINDOW_MS;
    const recent = sessions.filter((s) => s.completedAt >= cutoff);
    if (recent.length === 0) return 0;

    const byDomain = new Map<string, { sum: number; count: number }>();
    for (const session of recent) {
      const bucket = byDomain.get(session.domainId) ?? { sum: 0, count: 0 };
      bucket.sum += session.score;
      bucket.count += 1;
      byDomain.set(session.domainId, bucket);
    }

    let weightedSum = 0;
    let totalWeight = 0;
    for (const weight of domainWeights) {
      if (weight.weightPercent <= 0) continue;
      const bucket = byDomain.get(weight.domainId);
      if (!bucket) continue;
      weightedSum += (bucket.sum / bucket.count) * weight.weightPercent;
      totalWeight += weight.weightPercent;
    }

    let score: number;
    if (totalWeight > 0) {
      score = weightedSum / totalWeight;
    } else {
      const averages = Array.from(byDomain.values(), (b) => b.sum / b.count);
      score = averages.reduce((a, b) => a + b, 0) / averages.length;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  },
} as const;
