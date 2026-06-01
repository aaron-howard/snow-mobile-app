export interface DomainWeight {
  domainId: string;
  weightPercent: number;
}

/**
 * A domain-scoped session score feeding the readiness calculation. Epoch-ms
 * timestamps (the design's `StudySession` uses `Date`; numbers stay aligned
 * with the data-layer DTOs and avoid timezone ambiguity).
 */
export interface StudySessionScore {
  domainId: string;
  score: number; // 0–100
  completedAt: number; // epoch ms
  sessionType: 'quiz' | 'simulator';
}

export interface StreakResult {
  current: number;
  longest: number;
}

export interface ScoreHistoryEntry {
  score: number; // 0–100
  recordedAt: number; // epoch ms
}

export interface DomainAccuracy {
  domainId: string;
  correct: number;
  total: number;
}
