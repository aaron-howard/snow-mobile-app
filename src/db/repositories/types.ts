/**
 * Repository interfaces — the contract between the data layer and the
 * domain layer. Domain services depend on these interfaces, never on
 * concrete WatermelonDB models. This keeps the domain layer pure and
 * testable with in-memory fakes.
 */

import type { ReviewStatus } from '../models/Question';

// -------------------------------------------------------------------------
// Plain-data DTOs returned by repositories. These mirror the model shape
// but use plain TS objects (not WatermelonDB Model instances) so that
// domain code never touches database-bound types.
// -------------------------------------------------------------------------

export interface UserDTO {
  id: string;
  email: string;
  displayName: string;
  createdAt: number;
  streakCurrent: number;
  streakLongest: number;
  totalQuestionsAnswered: number;
  totalStudySessions: number;
}

export interface ExamDTO {
  id: string;
  name: string;
  certificationLevel: string;
  estimatedStudyHours: number;
  officialDurationMinutes: number;
  officialQuestionCount: number;
  officialPassingScore: number;
  minimumQuestionCount: number;
  contentVersion: string;
  contentDownloadedAt: number | null;
  isEnrolled: boolean;
  enrolledAt: number | null;
}

export interface TopicDomainDTO {
  id: string;
  examId: string;
  name: string;
  weightPercent: number;
}

export interface BlueprintSkillDTO {
  id: string;
  examId: string;
  domainId: string;
  code: string;
  description: string;
  blueprintSourceUrl: string;
  blueprintRetrievedAt: number;
}

export interface QuestionDTO {
  id: string;
  examId: string;
  domainId: string;
  blueprintSkillId: string;
  text: string;
  imageUrl: string | null;
  imageAltText: string;
  explanation: string;
  difficultyLevel: 'easy' | 'medium' | 'hard';
  bloomsLevel: 'remember' | 'understand' | 'apply' | 'analyze';
  authorId: string;
  sourceNotes: string;
  reviewStatus: ReviewStatus;
  reviewedBy: string | null;
  reviewedAt: number | null;
  publishedAt: number | null;
  timesAnswered: number;
  timesAnsweredCorrectly: number;
  isPoolReset: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface AnswerChoiceDTO {
  id: string;
  questionId: string;
  text: string;
  isCorrect: boolean;
  sortOrder: number;
}

export interface DeckDTO {
  id: string;
  examId: string;
  domainId: string | null;
  name: string;
  isCustom: boolean;
}

export interface FlashcardDTO {
  id: string;
  deckId: string;
  term: string;
  definition: string;
  isCustom: boolean;
  easeFactor: number;
  intervalDays: number;
  repetitionCount: number;
  nextReviewAt: number;
  lastReviewedAt: number | null;
}

export interface StudySessionDTO {
  id: string;
  userId: string;
  examId: string;
  sessionType: 'quiz' | 'flashcard' | 'simulator';
  startedAt: number;
  completedAt: number | null;
  score: number | null;
  totalQuestions: number;
  correctAnswers: number;
  durationSeconds: number;
}

export interface UserQuestionAttemptDTO {
  id: string;
  userId: string;
  questionId: string;
  sessionId: string;
  selectedAnswerId: string;
  isCorrect: boolean;
  attemptedAt: number;
}

export interface BookmarkDTO {
  id: string;
  userId: string;
  itemType: 'question' | 'flashcard';
  itemId: string;
  examId: string;
  createdAt: number;
}

export interface SimulatorSessionDTO {
  id: string;
  userId: string;
  examId: string;
  startedAt: number;
  pausedAt: number | null;
  submittedAt: number | null;
  expiresAt: number;
  remainingSeconds: number;
  state: 'active' | 'paused' | 'submitted' | 'discarded';
  answers: Record<string, string>;
  flaggedQuestions: string[];
}

export interface NotificationSettingsDTO {
  userId: string;
  dailyReminderEnabled: boolean;
  dailyReminderTime: string;
  streakRiskEnabled: boolean;
  congratulatoryEnabled: boolean;
  readiness80Enabled: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
}

export interface ReadinessScoreNotificationDTO {
  id: string;
  userId: string;
  examId: string;
  notificationType: 'congratulatory' | 'readiness_80';
  scoreAtNotification: number;
  sentAt: number;
}

export interface ContentUpdateNotificationDTO {
  id: string;
  examId: string;
  contentVersion: string;
  publishedAt: number;
  notifiedAt: number | null;
}

// -------------------------------------------------------------------------
// Repository interfaces
// -------------------------------------------------------------------------

export interface UserRepository {
  getById(id: string): Promise<UserDTO | null>;
  upsert(user: UserDTO): Promise<void>;
  incrementCounters(
    id: string,
    delta: { questionsAnswered?: number; studySessions?: number },
  ): Promise<void>;
  updateStreak(id: string, current: number, longest: number): Promise<void>;
}

export interface ExamRepository {
  list(): Promise<ExamDTO[]>;
  getById(id: string): Promise<ExamDTO | null>;
  listEnrolled(): Promise<ExamDTO[]>;
  setEnrollment(id: string, enrolled: boolean, enrolledAt: number | null): Promise<void>;
  markContentDownloaded(id: string, downloadedAt: number, contentVersion: string): Promise<void>;
}

export interface TopicDomainRepository {
  listByExam(examId: string): Promise<TopicDomainDTO[]>;
}

export interface BlueprintSkillRepository {
  listByExam(examId: string): Promise<BlueprintSkillDTO[]>;
  getById(id: string): Promise<BlueprintSkillDTO | null>;
}

export interface QuestionRepository {
  /**
   * Count of published questions with a valid blueprint skill for an exam
   * (same eligibility rules as {@link getPoolForSession}).
   */
  countPublishedForExam(examId: string): Promise<number>;
  /**
   * Pool of questions eligible for a quiz / simulator session — only
   * published questions with a valid blueprint skill (Property 27).
   * The repository, not domain logic, is responsible for this filter.
   */
  getPoolForSession(examId: string, domainId?: string): Promise<QuestionDTO[]>;
  getById(id: string): Promise<QuestionDTO | null>;
  /**
   * For the review queue: published questions the user has answered
   * incorrectly, ordered by descending incorrect count.
   */
  getReviewQueue(userId: string, examId: string): Promise<QuestionDTO[]>;
  incrementAttemptCounters(id: string, wasCorrect: boolean): Promise<void>;
  /** Reset the pool when all questions have been answered (Requirement 3.8). */
  resetPool(examId: string): Promise<void>;
}

export interface AnswerChoiceRepository {
  listByQuestion(questionId: string): Promise<AnswerChoiceDTO[]>;
}

export interface DeckRepository {
  listByExam(examId: string): Promise<DeckDTO[]>;
  getById(id: string): Promise<DeckDTO | null>;
  createCustom(deck: Omit<DeckDTO, 'id'>): Promise<DeckDTO>;
}

export interface FlashcardRepository {
  listByDeck(deckId: string): Promise<FlashcardDTO[]>;
  getById(id: string): Promise<FlashcardDTO | null>;
  upsertSRSState(
    id: string,
    state: Pick<
      FlashcardDTO,
      'easeFactor' | 'intervalDays' | 'repetitionCount' | 'nextReviewAt' | 'lastReviewedAt'
    >,
  ): Promise<void>;
  createCustom(card: Omit<FlashcardDTO, 'id'>): Promise<FlashcardDTO>;
}

export interface StudySessionRepository {
  create(
    session: Omit<StudySessionDTO, 'id' | 'completedAt' | 'score' | 'correctAnswers'>,
  ): Promise<StudySessionDTO>;
  complete(
    id: string,
    completion: {
      completedAt: number;
      score: number;
      correctAnswers: number;
      /** Elapsed session time in seconds (Requirement 6.1). */
      durationSeconds?: number;
    },
  ): Promise<void>;
  listForUserExam(userId: string, examId: string, sinceMs?: number): Promise<StudySessionDTO[]>;
}

/** Per-domain correct/total tally for the progress dashboard accuracy chart. */
export interface DomainAccuracyTally {
  domainId: string;
  correct: number;
  total: number;
}

export interface UserQuestionAttemptRepository {
  create(attempt: Omit<UserQuestionAttemptDTO, 'id'>): Promise<UserQuestionAttemptDTO>;
  countIncorrectByQuestion(userId: string, examId: string): Promise<Map<string, number>>;
  /**
   * Per-domain accuracy for an exam (Requirement 6.2). Optionally restricted to
   * attempts on/after `sinceMs` (used to scope the readiness score to the last
   * 30 days). When a question has multiple attempts, every attempt counts.
   */
  accuracyByDomain(userId: string, examId: string, sinceMs?: number): Promise<DomainAccuracyTally[]>;
}

export interface BookmarkRepository {
  listForUser(userId: string): Promise<BookmarkDTO[]>;
  listForUserAndExam(userId: string, examId: string): Promise<BookmarkDTO[]>;
  find(userId: string, itemType: 'question' | 'flashcard', itemId: string): Promise<BookmarkDTO | null>;
  create(bookmark: Omit<BookmarkDTO, 'id'>): Promise<BookmarkDTO>;
  delete(id: string): Promise<void>;
}

export interface SimulatorSessionRepository {
  getActive(userId: string, examId: string): Promise<SimulatorSessionDTO | null>;
  create(
    session: Omit<SimulatorSessionDTO, 'id' | 'answers' | 'flaggedQuestions' | 'submittedAt' | 'pausedAt'>,
  ): Promise<SimulatorSessionDTO>;
  update(id: string, patch: Partial<SimulatorSessionDTO>): Promise<void>;
  /** Sessions still within the 90-day retention window (Req 5.7). */
  listRecent(userId: string, examId: string): Promise<SimulatorSessionDTO[]>;
}

export interface NotificationSettingsRepository {
  get(userId: string): Promise<NotificationSettingsDTO | null>;
  upsert(settings: NotificationSettingsDTO): Promise<void>;
}

export interface ReadinessScoreNotificationRepository {
  getLast(
    userId: string,
    examId: string,
    type: 'congratulatory' | 'readiness_80',
  ): Promise<ReadinessScoreNotificationDTO | null>;
  create(notification: Omit<ReadinessScoreNotificationDTO, 'id'>): Promise<ReadinessScoreNotificationDTO>;
}

export interface ContentUpdateNotificationRepository {
  listUnsent(): Promise<ContentUpdateNotificationDTO[]>;
  markNotified(id: string, notifiedAt: number): Promise<void>;
}
