# Design Document: ServiceNow Certification Study App

## Overview

The ServiceNow Certification Study App is a cross-platform mobile application built with **React Native + Expo** targeting iOS and Android. It provides structured study materials, practice questions, flashcards, progress tracking, and exam simulations for the full range of ServiceNow certification paths (CSA, CAD, CIS-ITSM, CIS-HR, etc.).

The backend is decomposed into three independent services: **Neon** (managed Postgres) holds the source-of-truth data; a **Hono** API running on **Cloudflare Workers** exposes the two sync RPCs (`pull_changes` / `push_changes`) and any future server-side logic; **Clerk** owns user authentication. WatermelonDB on the client syncs with Postgres via the Workers API. This split keeps each service replaceable: the data store, the API, and the auth provider can each be swapped without touching the other two.

### Key Design Goals

- **Offline-first**: All core study features work without an internet connection; data syncs when connectivity is restored.
- **Cross-platform parity**: A single TypeScript codebase delivers a native-quality experience on both iOS and Android.
- **Correctness over cleverness**: Business logic (spaced repetition, readiness scoring, streak tracking) is implemented as pure functions that are easy to test and reason about.
- **Accessibility by default**: WCAG 2.1 AA compliance is built into the component library, not bolted on afterward.

### Technology Choices

| Concern | Choice | Rationale |
|---|---|---|
| Framework | React Native + Expo SDK 54 | 60%+ of RN developers use Expo; handles native build complexity, OTA updates, and device APIs |
| Navigation | Expo Router v4 (file-based) | Aligns routing with file system; built on React Navigation; supports deep links and notification routing |
| State management | Zustand | Minimal boilerplate, excellent TypeScript support, suitable for medium-complexity shared state |
| Local database | WatermelonDB (SQLite adapter) | Reactive, offline-first, lazy-loaded; purpose-built for React Native offline sync |
| Remote database | Neon (managed Postgres, serverless) | Branching for preview environments; HTTP-friendly driver suits Cloudflare Workers; no vendor lock-in beyond standard Postgres |
| API runtime | Hono on Cloudflare Workers | Edge runtime with low cold-start; Hono gives ergonomic routing and middleware; deploys to ~300 PoPs at $0 baseline cost |
| Authentication | Clerk (`@clerk/clerk-expo` on client, `@clerk/backend` in Worker) | Drop-in email/password + Google/Apple social; ships SecureStore-backed token cache for Expo; account lockout, session lifetime, and email verification handled by the provider |
| Push notifications | Expo Notifications (`expo-notifications`) | Unified API for APNs and FCM; handles scheduling, quiet hours, and deep-link routing |
| Animations | React Native Reanimated 3 | Worklet-based animations run on the UI thread; required for 300 ms flashcard flip and swipe gestures |
| Property-based testing | fast-check | Mature PBT library for TypeScript; supports arbitrary generators and shrinking |
| Unit testing | Jest + React Native Testing Library | Standard RN test stack |

---

## Architecture

The app follows a **layered architecture** with strict dependency direction: UI → Domain → Data.

```
┌─────────────────────────────────────────────────────────┐
│                        UI Layer                         │
│  Expo Router screens  ·  Shared component library       │
│  Zustand store hooks  ·  React Native Reanimated        │
│  ClerkProvider (token cache via expo-secure-store)      │
└────────────────────────────┬────────────────────────────┘
                             │ calls
┌────────────────────────────▼────────────────────────────┐
│                      Domain Layer                       │
│  Pure business logic (no I/O)                           │
│  · SpacedRepetitionEngine  · ReadinessScoreCalculator   │
│  · StreakTracker            · QuizSessionManager         │
│  · ExamSimulatorController  · BookmarkService            │
│  · NotificationScheduler    · OfflineSyncQueue           │
│  · EnrollmentGuard          · ContentStalenessChecker    │
└────────────────────────────┬────────────────────────────┘
                             │ calls
┌────────────────────────────▼────────────────────────────┐
│                       Data Layer                        │
│  WatermelonDB (SQLite)   ·  API client (fetch + Clerk)  │
│  Repository interfaces   ·  Sync adapter                │
│  SecureStore (Clerk JWT) ·  Expo FileSystem (downloads) │
└────────────────────────────┬────────────────────────────┘
                             │ HTTPS, Bearer <Clerk JWT>
┌────────────────────────────▼────────────────────────────┐
│                Cloudflare Worker (Hono)                 │
│  POST /sync/pull_changes  ·  POST /sync/push_changes    │
│  Clerk JWT middleware  ·  per-user row scoping          │
└────────────────────────────┬────────────────────────────┘
                             │ Neon serverless driver (HTTP)
┌────────────────────────────▼────────────────────────────┐
│                  Neon (managed Postgres)                │
│  Source-of-truth tables mirror the WatermelonDB schema  │
└─────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Online**: UI actions → Domain logic → WatermelonDB (local write) → background sync to the Worker API → Neon.
2. **Offline**: UI actions → Domain logic → WatermelonDB (local write) → queued for sync.
3. **Sync**: On reconnect, WatermelonDB's built-in sync protocol calls the Worker's `pull_changes` and `push_changes` endpoints. The Worker verifies the Clerk JWT, scopes every row by `user_id`, and translates the change set into Postgres upserts via the Neon HTTP driver. Sync begins within 60 seconds of a stable connection (≥5 consecutive seconds) being established.
4. **Auth**: Clerk hosts sign-in/sign-up and issues short-lived session JWTs. The Expo client attaches the JWT to every Worker request as a `Bearer` token. The Worker verifies the JWT signature against Clerk's JWKS and extracts the user ID — no shared secrets sit on the client.

### Navigation Structure (Expo Router)

```
app/
├── (auth)/
│   ├── login.tsx
│   ├── register.tsx
│   └── forgot-password.tsx
├── (tabs)/
│   ├── _layout.tsx          ← bottom tab navigator
│   ├── index.tsx            ← Home / active study list
│   ├── catalog.tsx          ← Exam catalog
│   ├── progress.tsx         ← Progress dashboard
│   └── profile.tsx          ← Profile + settings
├── exam/
│   ├── [examId]/
│   │   ├── quiz.tsx
│   │   ├── flashcards.tsx
│   │   ├── simulator.tsx
│   │   └── review.tsx
├── bookmarks.tsx
└── _layout.tsx              ← root layout (auth guard)
```

Notification deep-link routing:
- Daily reminder tap → `/(tabs)/index` (home screen)
- Streak-risk tap → `/(tabs)/index` (active study list)
- Congratulatory tap → `/exam/[examId]/progress` (progress dashboard for relevant exam)
- Readiness-80 tap → `/exam/[examId]/progress`

---

## Components and Interfaces

### Domain Service Interfaces

```typescript
// SpacedRepetitionEngine — pure, no I/O
interface SpacedRepetitionEngine {
  /**
   * Compute the next review interval for a flashcard given its current
   * SM-2 state and the user's response quality (0–5).
   */
  computeNextInterval(card: FlashcardSRSState, quality: ResponseQuality): FlashcardSRSState;

  /**
   * Given a deck's cards and the current date, return the subset that
   * are due for review today.
   */
  getDueCards(cards: FlashcardSRSState[], today: Date): FlashcardSRSState[];
}

// ReadinessScoreCalculator — pure, no I/O
interface ReadinessScoreCalculator {
  /**
   * Calculate a 0–100 readiness score for an exam using only sessions
   * completed within the last 30 days, weighted by domain importance.
   */
  calculate(sessions: StudySession[], domainWeights: DomainWeight[]): number;
}

// StreakTracker — pure, no I/O
interface StreakTracker {
  /**
   * Given a sorted list of session completion dates (local timezone),
   * compute the current streak and longest streak.
   */
  compute(sessionDates: Date[], today: Date): StreakResult;
}

// QuizSessionManager
interface QuizSessionManager {
  startSession(examId: string, domainFilter?: string): Promise<QuizSession>;
  startBookmarkSession(examId: string): Promise<QuizSession>;
  submitAnswer(sessionId: string, questionId: string, answerId: string): Promise<AnswerResult>;
  endSession(sessionId: string): Promise<SessionSummary>;
}

// ExamSimulatorController
interface ExamSimulatorController {
  startSimulator(examId: string): Promise<SimulatorSession>;
  flagQuestion(sessionId: string, questionId: string): Promise<void>;
  unflagQuestion(sessionId: string, questionId: string): Promise<void>;
  submitSimulator(sessionId: string): Promise<SimulatorResult>;
  pauseSimulator(sessionId: string): Promise<void>;
  resumeSimulator(sessionId: string): Promise<SimulatorSession>;
}

// BookmarkService — pure logic layer
interface BookmarkService {
  toggleBookmark(item: BookmarkableItem, bookmarkList: BookmarkRecord[]): BookmarkRecord[];
  getBookmarksForExam(examId: string, bookmarkList: BookmarkRecord[]): BookmarkRecord[];
  sortByDateDescending(bookmarks: BookmarkRecord[]): BookmarkRecord[];
  groupByExam(bookmarks: BookmarkRecord[]): Map<string, BookmarkRecord[]>;
}

// EnrollmentGuard — pure, no I/O
interface EnrollmentGuard {
  /**
   * Returns true if the user can enroll in a new exam (active count < 5).
   */
  canEnroll(activeExamIds: string[]): boolean;
}

// ContentStalenessChecker — pure, no I/O
interface ContentStalenessChecker {
  /**
   * Returns true if the downloaded content is more than 30 days old.
   */
  isStale(downloadedAt: Date, today: Date): boolean;
}

// NotificationScheduler — pure logic layer (scheduling decisions only; I/O via expo-notifications)
interface NotificationScheduler {
  computeReminderFireTime(configuredTime: string, today: Date): Date;
  rescheduleForQuietHours(scheduledTime: Date, quietStart: string, quietEnd: string): Date;
  shouldSendStreakRisk(sessionDates: Date[], today: Date, cutoffHour: number): boolean;
  shouldSendCongratulatory(
    scoreHistory: ScoreHistoryEntry[],
    lastNotificationAt: Date | null,
    now: Date
  ): boolean;
  shouldSendReadiness80(
    scoreHistory: ScoreHistoryEntry[],
    lastReadiness80NotificationAt: Date | null
  ): boolean;
}

// OfflineSyncQueue
interface OfflineSyncQueue {
  enqueue(update: ProgressUpdate): void;
  flush(): Promise<SyncResult>;
  getPendingCount(): number;
  retryOnReconnect(): void;
}
```

### UI Component Library

Key shared components:

| Component | Description |
|---|---|
| `QuestionCard` | Renders a question with answer choices; emits `onAnswer` event; supports image rendering at full card width; includes `accessibilityLabel` on all interactive elements |
| `FlashcardDeck` | Swipeable card stack using Reanimated; handles left/right swipe gestures and flip animation (≤300 ms) |
| `TimerDisplay` | Fixed-position countdown timer; updates every second via `setInterval`; always visible without scrolling |
| `ProgressRing` | Circular readiness score indicator (0–100) |
| `DomainAccuracyChart` | Bar chart of per-domain accuracy using `react-native-svg`; includes text labels alongside color coding |
| `StudyCalendar` | Monthly calendar with highlighted study days |
| `OfflineBanner` | Persistent header label shown when device has no internet connection |
| `BookmarkButton` | Animated bookmark icon with 500 ms state transition |
| `ContentStaleWarning` | Banner shown when downloaded exam content is more than 30 days old |
| `EnrollmentLimitWarning` | Dialog shown when user attempts to enroll in a 6th active exam |
| `HighContrastThemeProvider` | Applies high-contrast theme to all screens within 500 ms of activation |
| `ScaledText` | Text component that respects Dynamic Type (iOS) and font scaling (Android) from 100% to 200% without truncation or clipping |

All interactive elements (buttons, inputs, cards, icons) include:
- A non-empty `accessibilityLabel` describing purpose or action
- `accessibilityRole` set appropriately
- Dynamic content changes announced via `accessibilityLiveRegion`

Color-coded indicators (e.g., correct/incorrect feedback, pass/fail status, domain accuracy levels) always include both a text label and an icon alongside the color, so information is never conveyed by color alone.

---

## Data Models

### WatermelonDB Schema

```typescript
// users (mirrored from Clerk; `id` is the Clerk user ID)
interface UserRecord {
  id: string;                  // Clerk user ID (e.g. "user_2abc…")
  email: string;
  displayName: string;
  createdAt: number;           // Unix timestamp
  streakCurrent: number;
  streakLongest: number;
  totalQuestionsAnswered: number;
  totalStudySessions: number;
}

// exams (content, downloaded per exam)
interface ExamRecord {
  id: string;
  name: string;
  certificationLevel: string;  // e.g. "Fundamentals", "Implementation Specialist"
  estimatedStudyHours: number;
  officialDuration: number;    // minutes
  officialQuestionCount: number;
  officialPassingScore: number; // percentage, e.g. 70
  minimumQuestionCount: number; // always >= 200 per Requirement 3.7
  contentVersion: string;
  contentDownloadedAt: number | null;
  isEnrolled: boolean;
  enrolledAt: number | null;   // Unix timestamp
}

// topic_domains
interface TopicDomainRecord {
  id: string;
  examId: string;
  name: string;
  weightPercent: number;       // 0–100, sum per exam = 100
}

// blueprint_skills (finer-grained than topic_domains; sourced from the official published exam blueprint)
// Every published Question references exactly one BlueprintSkillRecord. This provides legally
// defensible content provenance: each question is traceable to a public, citable blueprint skill.
interface BlueprintSkillRecord {
  id: string;
  examId: string;
  domainId: string;            // FK to topic_domains
  code: string;                // e.g. "1.2.a" — matches the published blueprint section reference
  description: string;         // skill description copied from the blueprint (factual; not creative content)
  blueprintSourceUrl: string;  // URL of the public blueprint document this skill is drawn from
  blueprintRetrievedAt: number; // Unix timestamp; for audit/freshness
}

// questions
interface QuestionRecord {
  id: string;
  examId: string;
  domainId: string;
  blueprintSkillId: string;    // FK to blueprint_skills; required for every published question
  text: string;
  imageUrl: string | null;
  imageAltText: string;        // always present (accessibility); non-empty even for text-only questions
  explanation: string;
  difficultyLevel: 'easy' | 'medium' | 'hard';
  bloomsLevel: 'remember' | 'understand' | 'apply' | 'analyze';
  authorId: string;            // user ID of the original author (for accountability and audit)
  sourceNotes: string;         // free-text notes documenting how this question maps to the blueprint skill; "" allowed
  reviewStatus: 'draft' | 'reviewed' | 'published';
  reviewedBy: string | null;   // user ID of reviewer; null until reviewed
  reviewedAt: number | null;   // Unix timestamp; null until reviewed
  publishedAt: number | null;  // Unix timestamp; null until published
  timesAnswered: number;
  timesAnsweredCorrectly: number;
  isPoolReset: boolean;        // true after pool reset; reset to false once answered again
  createdAt: number;
  updatedAt: number;
}

// answer_choices
interface AnswerChoiceRecord {
  id: string;
  questionId: string;
  text: string;
  isCorrect: boolean;
  sortOrder: number;
}

// flashcards
interface FlashcardRecord {
  id: string;
  deckId: string;
  term: string;
  definition: string;
  isCustom: boolean;
  // SM-2 state
  easeFactor: number;          // default 2.5, never < 1.3
  intervalDays: number;        // default 1
  repetitionCount: number;     // default 0
  nextReviewAt: number;        // Unix timestamp
  lastReviewedAt: number | null;
}

// decks
interface DeckRecord {
  id: string;
  examId: string;
  domainId: string | null;
  name: string;
  isCustom: boolean;
}

// study_sessions
interface StudySessionRecord {
  id: string;
  userId: string;
  examId: string;
  sessionType: 'quiz' | 'flashcard' | 'simulator';
  startedAt: number;
  completedAt: number | null;
  score: number | null;        // percentage
  totalQuestions: number;
  correctAnswers: number;
  durationSeconds: number;
}

// user_question_attempts
interface UserQuestionAttemptRecord {
  id: string;
  userId: string;
  questionId: string;
  sessionId: string;
  selectedAnswerId: string;
  isCorrect: boolean;
  attemptedAt: number;
}

// bookmarks
interface BookmarkRecord {
  id: string;
  userId: string;
  itemType: 'question' | 'flashcard';
  itemId: string;
  examId: string;
  createdAt: number;           // Unix timestamp; used for "most recent first" sort
}

// simulator_sessions
interface SimulatorSessionRecord {
  id: string;
  userId: string;
  examId: string;
  startedAt: number;
  pausedAt: number | null;
  submittedAt: number | null;
  expiresAt: number;           // startedAt + 90 days (Requirement 5.7 retention)
  remainingSeconds: number;
  state: 'active' | 'paused' | 'submitted' | 'discarded';
  answers: string;             // JSON: { [questionId]: answerId }
  flaggedQuestions: string;    // JSON: string[]
}

// notification_settings
interface NotificationSettingsRecord {
  userId: string;
  dailyReminderEnabled: boolean;
  dailyReminderTime: string;   // "HH:MM" local time
  streakRiskEnabled: boolean;
  congratulatoryEnabled: boolean;
  readiness80Enabled: boolean;
  quietHoursStart: string | null;  // "HH:MM"; quiet window must be ≤ 12 consecutive hours
  quietHoursEnd: string | null;    // "HH:MM"
}

// readiness_score_notifications (tracks last notification per exam to prevent re-sends)
interface ReadinessScoreNotificationRecord {
  id: string;
  userId: string;
  examId: string;
  notificationType: 'congratulatory' | 'readiness_80';
  scoreAtNotification: number;
  sentAt: number;              // Unix timestamp
}

// content_update_notifications
interface ContentUpdateRecord {
  id: string;
  examId: string;
  contentVersion: string;
  publishedAt: number;         // Unix timestamp
  notifiedAt: number | null;   // when enrolled users were notified
}
```

### Domain Types (pure TypeScript, no DB dependency)

```typescript
type ResponseQuality = 0 | 1 | 2 | 3 | 4 | 5;

interface FlashcardSRSState {
  id: string;
  easeFactor: number;       // ≥ 1.3
  intervalDays: number;     // days until next review
  repetitionCount: number;
  nextReviewAt: Date;
}

interface DomainWeight {
  domainId: string;
  weightPercent: number;    // 0–100
}

interface StudySession {
  examId: string;
  domainId: string;
  score: number;            // 0–100
  completedAt: Date;
  sessionType: 'quiz' | 'simulator';
}

interface StreakResult {
  current: number;
  longest: number;
}

interface SessionSummary {
  sessionId: string;
  correctAnswers: number;
  incorrectAnswers: number;
  scorePercent: number;
  domainBreakdown: { domainId: string; correct: number; total: number }[];
}

interface SimulatorResult extends SessionSummary {
  passed: boolean;
  passingThreshold: number;
  incorrectQuestions: { questionId: string; explanation: string }[];
}

interface ScoreHistoryEntry {
  examId: string;
  score: number;            // 0–100
  recordedAt: Date;
}

interface BookmarkableItem {
  id: string;
  itemType: 'question' | 'flashcard';
  examId: string;
}

interface SyncResult {
  syncedCount: number;
  failedCount: number;
  pendingCount: number;
}

interface ProgressUpdate {
  sessionId: string;
  examId: string;
  userId: string;
  payload: StudySessionRecord;
  createdAt: Date;
}
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Password length validation accepts and rejects correct ranges

*For any* string, the password validation function SHALL return valid if and only if the string's length is between 8 and 128 characters (inclusive); it SHALL return invalid for any string shorter than 8 or longer than 128 characters.

**Validates: Requirements 1.3**

---

### Property 2: Account lockout triggers at exactly 5 failed attempts within the window

*For any* sequence of failed login attempt timestamps, if 5 or more attempts fall within any rolling 10-minute window, the lockout evaluator SHALL return a locked state; if fewer than 5 attempts fall within any 10-minute window, it SHALL return an unlocked state.

**Validates: Requirements 1.9, 1.10**

---

### Property 3: Enrollment limit enforced at 5 active exams

*For any* list of currently active exam enrollments, the enrollment guard SHALL permit enrollment if and only if the active count is strictly less than 5; it SHALL reject enrollment when the active count is 5 or more.

**Validates: Requirements 2.6**

---

### Property 4: Domain filter returns only matching questions

*For any* set of questions with varying domain tags and any selected domain filter, the filtered question set SHALL contain every question tagged with the selected domain and SHALL contain no question not tagged with that domain.

**Validates: Requirements 2.5**

---

### Property 5: Review queue contains all incorrect answers ordered by descending incorrect count

*For any* set of answered questions where some are answered incorrectly, the Review queue SHALL contain every incorrectly answered question, no correctly-answered-only question SHALL appear in the queue, and no question with a lower incorrect-answer count SHALL appear before a question with a higher incorrect-answer count.

**Validates: Requirements 3.5, 3.6**

---

### Property 6: Quiz answer is attributed to all of the question's domain tags

*For any* question tagged with one or more topic domains, when the user answers that question, the Progress_Tracker SHALL record the attempt under every domain tag associated with that question — not a subset.

**Validates: Requirements 3.4**

---

### Property 7: Every question rendered in a quiz has at least 4 answer choices

*For any* question presented during a Quiz or Exam_Simulator session, the rendered question card SHALL display a minimum of 4 answer choices.

**Validates: Requirements 3.1**

---

### Property 8: Every question has a non-empty accessible text description

*For any* question (whether it contains an image or not), the question record SHALL have a non-empty `imageAltText` / accessible description field that can be read by screen readers.

**Validates: Requirements 3.11**

---

### Property 9: Custom flashcard validation rejects empty or whitespace-only fields

*For any* flashcard where the term field or the definition field is empty or composed entirely of whitespace characters, the save operation SHALL be rejected and no flashcard record SHALL be persisted.

**Validates: Requirements 4.10**

---

### Property 10: Spaced repetition interval ratio invariant

*For any* flashcard SRS state, the inter-session review interval computed after a "Still Learning" response (quality 0–2) SHALL be no more than 50% of the interval computed after a "Known" response (quality 3–5), regardless of the card's prior repetition history.

**Validates: Requirements 4.8**

---

### Property 11: SM-2 ease factor never falls below 1.3

*For any* flashcard and any arbitrarily long sequence of response qualities (0–5), the SM-2 ease factor SHALL never fall below 1.3 after any number of repetitions.

**Validates: Requirements 4.8**

---

### Property 12: Swipe-left re-inserts card at least 3 positions ahead

*For any* flashcard deck session with at least 4 remaining cards, when a user swipes a card left ("Still Learning"), the card SHALL be re-inserted at a position at least 3 cards ahead of the current position in the active card pool.

**Validates: Requirements 4.6**

---

### Property 13: Simulator submission confirmation counts are accurate

*For any* Exam_Simulator session with a known set of answered and flagged questions, the confirmation dialog SHALL display the exact count of unanswered questions and the exact count of flagged questions.

**Validates: Requirements 5.5**

---

### Property 14: Simulator results calculation is correct

*For any* submitted Exam_Simulator session, the results report SHALL correctly compute the overall score as a percentage, the pass/fail status based on the official passing threshold, the per-domain score breakdown, and the list of incorrectly answered questions.

**Validates: Requirements 5.6**

---

### Property 15: Readiness score is bounded in [0, 100] and ignores sessions older than 30 days

*For any* collection of study sessions (including sessions older than 30 days) and any set of domain weights, the readiness score calculation SHALL return a value in the closed interval [0, 100], and the result SHALL be identical to the score computed using only sessions completed within the last 30 days.

**Validates: Requirements 6.4, 6.5**

---

### Property 16: Readiness-80 notification fires exactly at qualifying score transitions

*For any* sequence of readiness score values with associated timestamps, the readiness-80 notification trigger SHALL fire exactly when the score reaches 80 for the first time, or when the score reaches 80 again after having previously dropped below 80 since the last notification; it SHALL not fire more than once per qualifying crossing.

**Validates: Requirements 6.6**

---

### Property 17: Streak increments exactly once per calendar day with a session, resets on missed day

*For any* sequence of study session completion timestamps (interpreted in local timezone), the streak counter SHALL increment by exactly 1 for each distinct calendar day on which at least one session was completed, and SHALL reset to 0 whenever a calendar day passes with no session completed.

**Validates: Requirements 6.7**

---

### Property 18: Bookmark toggle is an involution

*For any* item (question or flashcard) in any initial bookmark state, toggling the bookmark action twice SHALL return the item to its original bookmark state, and the bookmark list SHALL be unchanged from its state before the two toggles.

**Validates: Requirements 7.1, 7.2**

---

### Property 19: Bookmark list is grouped by exam and sorted by date descending

*For any* set of bookmarks with varying exam IDs and creation timestamps, the bookmark list view SHALL group all bookmarks by exam and within each group SHALL present bookmarks in descending order of creation timestamp (most recent first).

**Validates: Requirements 7.3**

---

### Property 20: Bookmark session presents only items for the selected exam

*For any* bookmark list containing items from multiple exams, starting a Quiz or Flashcard session from the Bookmark list for a specific exam SHALL present only the bookmarked items associated with that exam and no items from other exams.

**Validates: Requirements 7.4**

---

### Property 21: Notification quiet-hours rescheduling never fires during quiet hours

*For any* notification scheduled at a time that falls within the configured quiet hours window (of up to 12 consecutive hours), the rescheduled fire time SHALL be at or after the first minute following the end of the quiet hours window, and SHALL never fall within the quiet hours window itself.

**Validates: Requirements 8.4**

---

### Property 22: Congratulatory notification fires exactly on qualifying readiness score increases

*For any* sequence of readiness score values with associated timestamps, the congratulatory notification trigger logic SHALL fire a notification exactly when the score has increased by 10 or more points since the last congratulatory notification (or since enrollment if no notification has been sent), and SHALL not fire more than once within any 24-hour period per exam.

**Validates: Requirements 8.3**

---

### Property 23: Offline progress updates are fully queued and retried until synchronized

*For any* set of progress updates generated while the device has no internet connection, all updates SHALL be present in the local queue; after the device reconnects and maintains a stable connection for at least 5 consecutive seconds, the sync process SHALL begin within 60 seconds and SHALL retry automatically on any interruption until all updates are synchronized.

**Validates: Requirements 9.4, 9.5, 9.6**

---

### Property 24: Stale content warning fires for content older than 30 days

*For any* downloaded exam content, the staleness checker SHALL return stale (triggering a warning) if and only if the content was downloaded more than 30 days before the current date; content downloaded 30 days ago or less SHALL not trigger the warning.

**Validates: Requirements 9.8**

---

### Property 25: Every interactive element has a non-empty accessibility label

*For any* rendered interactive element (button, input, card, icon) in the app, the element SHALL have a non-empty `accessibilityLabel` that describes its purpose or action.

**Validates: Requirements 10.1**

---

### Property 26: High-contrast theme color pairs meet WCAG 2.1 AA contrast ratio

*For any* text or interactive element rendered while high-contrast mode is active, the foreground/background color pair SHALL have a contrast ratio of at least 4.5:1 as defined by WCAG 2.1 AA.

**Validates: Requirements 10.3**

---

### Property 27: Only published questions with a valid blueprint skill are presented to users

*For any* set of `QuestionRecord`s in the database, the question pool exposed to a Quiz, Flashcard session, or Exam_Simulator session SHALL contain only questions whose `reviewStatus` is `"published"` and whose `blueprintSkillId` references an existing `BlueprintSkillRecord`. Questions in `draft` or `reviewed` status, and questions with an orphaned `blueprintSkillId`, SHALL never appear in a user-facing session.

**Validates: Requirements 11.5, 11.6**

---

## Error Handling

### Authentication Errors

| Scenario | Behavior |
|---|---|
| Email already registered | Display inline error; do not create account |
| Invalid credentials | Display generic error; increment failed-attempt counter |
| Account locked | Display lockout message with remaining time (15 minutes); send email notification |
| Account unverified on login | Display error indicating account is unverified; offer to resend verification email |
| Verification link expired | Display error; offer resend |
| Auth timeout (> 3 s) | Cancel request; display timeout message |
| Social login provider error | Display provider name in error; offer email/password fallback |
| Password reset link expired (> 30 min) | Display expiry error; offer to request a new reset link |

### Enrollment and Content Errors

| Scenario | Behavior |
|---|---|
| Enrollment failure (system error) | Display error; leave active study list unchanged |
| Enrollment limit reached (> 5 active exams) | Display warning dialog; require user to remove an existing exam before adding a new one |
| Download insufficient storage | Display required vs. available storage; halt download; no partial content stored |
| Content more than 30 days old | Display `ContentStaleWarning` banner prompting user to refresh when connected |
| Exam content updated | Notify enrolled users who have downloaded that exam's content; update downloaded content within 24 hours |

### Session and Sync Errors

| Scenario | Behavior |
|---|---|
| Sync interrupted | Retain queue; retry on next stable connection |
| Simulator state unrestorable | Display error; offer restart or discard |
| Question pool exhausted | Reset pool; notify user that pool has been refreshed |
| Bookmark session with no items | Display message indicating no bookmarks for that exam; prevent session from starting |
| Progress dashboard with no session data | Display empty-state message indicating no study data is available yet |

### Offline Handling

- A persistent `OfflineBanner` component is rendered in the app header whenever `NetInfo.isConnected === false`.
- All write operations succeed locally via WatermelonDB and are queued for sync.
- Read operations use locally cached data; no "no data" errors are shown for content the user has downloaded.
- If the user attempts an action that requires connectivity (e.g., enrolling in a new exam without downloaded content), the app displays a contextual message explaining that the action requires an internet connection.
- When the device reconnects and maintains a stable connection for at least 5 consecutive seconds, sync begins within 60 seconds and continues until all queued updates are synchronized.

### Notification Permission Denied

- On first launch, the app requests notification permissions using `expo-notifications`.
- If the user denies permissions or later revokes them in system settings, the app detects this via `getPermissionsAsync()` and displays an in-app prompt with instructions to re-enable in device settings. No notification scheduling is attempted.

### Accessibility Error Prevention

- All color-coded indicators (correct/incorrect, pass/fail, domain accuracy) include both a text label and an icon so information is never conveyed by color alone.
- Dynamic Type and font scaling are supported from 100% to 200%; the `ScaledText` component prevents truncation, clipping, and overlap at all sizes within that range.
- High-contrast theme is applied to all screens within 500 ms of activation.

---

## Testing Strategy

### Dual Testing Approach

The testing strategy combines **unit/example-based tests** for specific behaviors and **property-based tests** for universal correctness guarantees.

### Unit Tests (Jest + React Native Testing Library)

Unit tests cover:
- Specific rendering examples for each screen and shared component
- Integration points between domain services and the data layer (using mocked repositories)
- Edge cases: empty decks, zero-question exams, expired sessions, locked accounts, empty bookmark lists, no session data (empty state)
- Notification scheduling logic with mocked `Date` and `expo-notifications`
- Accessibility: every interactive element has an `accessibilityLabel`; dynamic content uses `accessibilityLiveRegion`
- Font scaling: components rendered at 100%, 150%, and 200% font scale verify no truncation, clipping, or overlap
- Color-coded indicators: verify each includes both a text label and an icon
- High-contrast theme application: verify theme applied to all screens within 500 ms
- Notification deep-link routing: verify each notification type opens the correct screen
- Enrollment limit: verify warning shown and enrollment blocked when active exam count reaches 5

### Property-Based Tests (fast-check, minimum 100 iterations per property)

Each property test is tagged with a comment in the format:
`// Feature: servicenow-cert-study-app, Property N: <property text>`

Properties to implement as automated tests:

| Property | Domain Service Under Test | Generator Strategy |
|---|---|---|
| 1 — Password length validation | `validatePassword(s: string)` | `fc.string()` of arbitrary length; verify accept iff length in [8,128] |
| 2 — Account lockout at 5 attempts | `evaluateLockout(attempts: Date[], windowMs: number)` | `fc.array(fc.date())` of attempt timestamps; verify locked iff ≥5 in any 10-min window |
| 3 — Enrollment limit at 5 active exams | `EnrollmentGuard.canEnroll(activeExamIds)` | `fc.array(fc.string(), {maxLength: 10})` of exam IDs; verify canEnroll iff length < 5 |
| 4 — Domain filter returns only matching questions | `filterByDomain(questions, domainId)` | `fc.array` of questions with random domain tags + `fc.string()` domain filter; verify all results match domain and no non-matching results included |
| 5 — Review queue completeness and ordering | `buildReviewQueue(questions)` | `fc.array` of questions with random incorrect counts; verify all incorrect questions present, no correct-only questions, sorted descending |
| 6 — Domain attribution on answer | `recordAttempt(question, answer)` | `fc.record` with `fc.array(fc.string())` domain arrays; verify all domains recorded |
| 7 — Minimum 4 answer choices per question | `renderQuestion(question)` | `fc.record` of question with `fc.array(fc.record(), {minLength: 4})` choices |
| 8 — Accessible description on every question | `validateQuestion(question)` | `fc.record` of question with optional image; verify `imageAltText` is non-empty string |
| 9 — Custom flashcard empty field rejection | `validateFlashcard(term, definition)` | `fc.string()` including `fc.stringOf(fc.char(' '))` whitespace-only; verify rejection |
| 10 — SRS interval ratio (Still Learning ≤ 50% of Known) | `SpacedRepetitionEngine.computeNextInterval` | `fc.record` of `FlashcardSRSState` + `fc.constantFrom(0,1,2)` vs `fc.constantFrom(3,4,5)` |
| 11 — SM-2 ease factor ≥ 1.3 | `SpacedRepetitionEngine.computeNextInterval` | `fc.record` of `FlashcardSRSState` + `fc.integer({min:0,max:5})`, applied N times via `fc.array` |
| 12 — Swipe-left re-inserts ≥3 positions ahead | `FlashcardSessionManager.swipeLeft(deck, currentIndex)` | `fc.array` of cards with minLength 4; verify re-insertion index ≥ currentIndex + 3 |
| 13 — Simulator confirmation counts accurate | `buildConfirmationSummary(session)` | `fc.record` of session with random answered/flagged states; verify counts match |
| 14 — Simulator results calculation correct | `calculateSimulatorResult(session, questions)` | `fc.array` of answer records; verify score, pass/fail, domain breakdown all correct |
| 15 — Readiness score in [0,100] and ignores old sessions | `ReadinessScoreCalculator.calculate` | `fc.array` of sessions with dates spanning > 30 days + domain weights; verify result in [0,100] and equals score with only recent sessions |
| 16 — Readiness-80 notification fires at qualifying transitions | `NotificationScheduler.shouldSendReadiness80` | `fc.array` of score/timestamp pairs crossing 80 threshold; verify fires exactly at qualifying transitions |
| 17 — Streak increments once per calendar day | `StreakTracker.compute` | `fc.array(fc.date())` of session timestamps; verify streak matches expected calendar-day count |
| 18 — Bookmark toggle involution | `BookmarkService.toggleBookmark(item, bookmarkList)` | `fc.record` of item + `fc.boolean()` initial state; verify double-toggle restores original state |
| 19 — Bookmark list grouped by exam and sorted by date | `BookmarkService.groupByExam + sortByDateDescending` | `fc.array` of bookmarks with random examIds and timestamps; verify grouping and descending sort |
| 20 — Bookmark session filters to selected exam | `BookmarkService.getBookmarksForExam` | `fc.array` of bookmarks with multiple examIds; verify only selected exam's bookmarks returned |
| 21 — Quiet hours rescheduling | `NotificationScheduler.rescheduleForQuietHours` | `fc.record` of times within quiet window; verify output ≥ quietEnd |
| 22 — Congratulatory notification fires on qualifying score increases | `NotificationScheduler.shouldSendCongratulatory` | `fc.array` of score/timestamp pairs; verify fires exactly on ≥10-point increases, max once per 24h |
| 23 — Offline queue retried until synchronized | `OfflineSyncQueue.flush()` | `fc.array` of progress updates; simulate interruption; verify queue retried on reconnect |
| 24 — Stale content warning fires for content > 30 days old | `ContentStalenessChecker.isStale` | `fc.date()` for downloadedAt; verify isStale iff (today - downloadedAt) > 30 days |
| 25 — Every interactive element has accessibility label | Component render tests | Render each component; verify `accessibilityLabel` is non-empty string |
| 26 — High-contrast color pairs meet 4.5:1 contrast ratio | `highContrastTheme` color map | Enumerate all foreground/background pairs; compute WCAG contrast ratio; verify ≥ 4.5:1 |
| 27 — Only published questions with a valid blueprint skill reach users | `QuestionRepository.getPoolForSession(examId)` | `fc.array` of `QuestionRecord` mixing draft/reviewed/published states and valid/orphaned `blueprintSkillId`s; verify only published + valid-FK questions are returned |

### Integration Tests

Integration tests (example-based, 1–3 scenarios each) cover:
- WatermelonDB sync round-trip against a locally-running Hono Worker pointed at a Neon branch database
- Expo Notifications scheduling and delivery on a simulator
- Offline download and content availability check
- Exam simulator pause/resume state persistence
- Bookmark sync across devices within 30 seconds (Requirement 7.6)
- Content update notification delivery to enrolled users (Requirement 2.7)
- Sync begins within 60 seconds of stable reconnect (Requirement 9.5)

### Smoke Tests

Smoke tests (single execution) cover:
- Minimum 200 questions per supported exam (Requirement 3.7)
- Simulator results retention policy (90-day minimum) (Requirement 5.7)

### Accessibility Testing

- Automated: `jest-axe` for component-level contrast and label checks
- Manual: VoiceOver (iOS Simulator) and TalkBack (Android Emulator) walkthroughs for all primary flows
- Font scaling: manual verification at 100%, 150%, and 200% on both platforms
- Note: Full WCAG 2.1 AA validation requires manual testing with assistive technologies and expert accessibility review.
