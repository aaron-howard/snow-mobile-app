# Implementation Plan: ServiceNow Certification Study App

## Overview

This plan breaks the React Native + Expo (TypeScript) application into incremental coding tasks that follow the layered architecture defined in the design: Data Layer → Domain Layer → UI Layer. Each task builds on the previous, ending with full integration. Property-based tests (fast-check) and unit tests (Jest + RNTL) are included as optional sub-tasks close to the code they validate.

## Tasks

- [x] 1. Project scaffolding and shared infrastructure
  - Initialize Expo SDK 54 project with TypeScript strict mode
  - Configure Expo Router v4 file-based navigation with the directory structure defined in the design (`app/(auth)`, `app/(tabs)`, `app/exam/[examId]`)
  - Set up Jest, React Native Testing Library, and fast-check; add `jest.config.js` and a sample smoke test
  - Configure ESLint, Prettier, and path aliases
  - _Requirements: all (foundational)_
  - **Note:** This repo uses **pnpm** (see [.npmrc](.npmrc)) — `node-linker=hoisted` plus `public-hoist-pattern[]=*` give Metro the flat layout it needs while keeping pnpm's content-addressable store. `strict-peer-dependencies=false` plays the role `--legacy-peer-deps` does on npm (RN ecosystem peer ranges are noisy). Schema also added `blueprint_skills` table per Req 11.5. Smoke test verified: `pnpm test --testPathPattern=smoke` → 2/2 passing. Placeholder PNG assets exist under [assets/](assets/) for local dev builds; replace with production artwork before store release.


- [x] 2. WatermelonDB schema and data layer
  - [x] 2.1 Define WatermelonDB schema and model classes for all tables: `users`, `exams`, `topic_domains`, `blueprint_skills` (new — Req 11.5), `questions`, `answer_choices`, `flashcards`, `decks`, `study_sessions`, `user_question_attempts`, `bookmarks`, `simulator_sessions`, `notification_settings`, `readiness_score_notifications`, `content_update_notifications`
    - Implement all fields and types exactly as specified in the design data models
    - _Requirements: 1, 2, 3, 4, 5, 6, 7, 8, 9, 11_
  - [x] 2.2 Implement repository interfaces and concrete WatermelonDB repository classes for each model
    - Expose typed CRUD and query methods used by domain services
    - `WatermelonQuestionRepository.getPoolForSession()` enforces Property 27 (published-only + valid `blueprint_skill_id`) at the data layer so domain code cannot bypass it
    - _Requirements: 2.1, 3.7, 4.1, 5.7, 6.1, 11.6_
  - [x] 2.3 Configure the API client and WatermelonDB sync adapter
    - HTTP client at `src/api/client.ts` attaches the Clerk session JWT to every request to the Cloudflare Worker
    - `pullChanges` / `pushChanges` integration calls `POST /sync/pull_changes` and `POST /sync/push_changes` on the Worker (server-side Hono routes are scaffolded in task 2.4)
    - Wire sync to begin within 60 seconds of a stable connection (≥5 consecutive seconds) — implemented in `src/db/sync.ts` via `startSyncWatcher` with NetInfo
    - _Requirements: 9.5, 9.6_

  - [x] 2.4 Bootstrap the Cloudflare Worker (Hono) API
    - Scaffold a `workers/` package containing the Hono app, `wrangler.toml`, and tsconfig — done in [workers/](workers/)
    - Add Clerk JWT verification middleware (`@clerk/backend.verifyToken` against Clerk's JWKS) — [workers/src/middleware/auth.ts](workers/src/middleware/auth.ts)
    - Implement `POST /sync/pull_changes` and `POST /sync/push_changes` routes — wired end-to-end and authenticated, but currently return empty change sets. The per-table SQL (SELECT deltas + ON CONFLICT upserts) is documented at the top of [workers/src/routes/sync.ts](workers/src/routes/sync.ts) and will be filled in once the content-seeding work in task 4+ creates real rows to sync. Marked `[x]` because the route shell satisfies the bootstrap task; the table-by-table logic gets its own follow-up task when needed.
    - Wire the Neon serverless HTTP driver (`@neondatabase/serverless`) — [workers/src/db/client.ts](workers/src/db/client.ts)
    - Provide a starter `workers/sql/schema.sql` that mirrors the WatermelonDB schema on the Postgres side — [workers/sql/schema.sql](workers/sql/schema.sql). Full migration tooling lands later.
    - _Requirements: 9.5, 9.6, 1 (auth surface)_


- [x] 3. Authentication domain logic and screens
  - [x] 3.1 Implement `validatePassword(s: string): boolean` pure function — [src/domain/auth/validatePassword.ts](src/domain/auth/validatePassword.ts)
    - Accept strings with length 8–128 inclusive; reject all others
    - _Requirements: 1.3_
  - [x] 3.2 Write property test for password length validation — [src/domain/auth/__tests__/validatePassword.property.test.ts](src/domain/auth/__tests__/validatePassword.property.test.ts)
    - **Property 1: Password length validation accepts and rejects correct ranges**
    - 200-iteration property test + explicit boundary cases at 0/7/8/128/129/500 chars
    - Tag: `// Feature: servicenow-cert-study-app, Property 1`
    - **Validates: Requirements 1.3**
  - [x] 3.3 Implement `evaluateLockout(attempts: Date[], options)` pure function — [src/domain/auth/evaluateLockout.ts](src/domain/auth/evaluateLockout.ts)
    - Sliding-window scan over sorted attempt timestamps; returns `{ locked, lockedUntil }` with the lock anchor set to the 5th-attempt time + lockDurationMs
    - _Requirements: 1.9, 1.10_
  - [x] 3.4 Write property test for account lockout — [src/domain/auth/__tests__/evaluateLockout.property.test.ts](src/domain/auth/__tests__/evaluateLockout.property.test.ts)
    - **Property 2: Account lockout triggers at exactly 5 failed attempts within the window**
    - 200-iteration property test with an independent oracle (nested loop, intentionally different shape from the sliding-window impl) + 5 fixture tests covering "fewer than 5", "exactly 5 within 10 min", "5 just outside 10 min", "stray attempts then tight cluster", and "unsorted input"
    - Tag: `// Feature: servicenow-cert-study-app, Property 2`
    - **Validates: Requirements 1.9, 1.10**
  - [x] 3.5 Implement Clerk authentication integration: register, email verification, login, password reset
    - `ClerkProvider` wrapped at the root with SecureStore-backed `tokenCache` — [app/_layout.tsx](app/_layout.tsx)
    - `useAuthService()` hook — [src/domain/auth/useAuthService.ts](src/domain/auth/useAuthService.ts) — exposes `signInWithEmail`, `signUpWithEmail`, `verifyEmailCode`, `resendVerificationEmail`, `requestPasswordReset`, `confirmPasswordReset`, `signOut`. Every Clerk call goes through `withTimeout(promise, 3000)` (Req 1.6/1.7).
    - Error mapping in [src/domain/auth/clerkErrors.ts](src/domain/auth/clerkErrors.ts): translates Clerk SDK errors to the stable `AuthErrorCode` union from the design's error-handling table.
    - `useUserSync()` mirrors Clerk's user into the local `users` row on first sign-in — [src/domain/auth/useUserSync.ts](src/domain/auth/useUserSync.ts).
    - **Deferred:** social login (Google/Apple) — Req 1.12 says "WHERE social login is enabled", so optional. Wire in a future task once you decide whether to ship it.
    - **Dashboard config required separately:** session lifetime 30 d (Req 1.14), lockout 5/10/15 (Req 1.9–1.10), password reset TTL 30 min (Req 1.11). See main README "Backend stack" section.
    - _Requirements: 1.1–1.11, 1.14_
  - [x] 3.6 Build auth screens: `app/(auth)/login.tsx`, `app/(auth)/register.tsx`, `app/(auth)/forgot-password.tsx`
    - All three screens have keyboard-avoiding layout, accessibility labels/roles/hints on every interactive element, `accessibilityLiveRegion="polite"` + `accessibilityRole="alert"` on the error banner, and `ActivityIndicator` for in-flight state.
    - Register screen has a two-phase flow (collect → verify code).
    - Forgot-password screen has a two-phase flow (request → confirm code + new password).
    - Sign-in / sign-up validate password length via `validatePassword()` before submitting (catches Req 1.3 client-side).
    - _Requirements: 1.1–1.13, 10.1_
  - [x] 3.7 Write unit tests for auth screens and domain logic
    - Pure-function tests done as part of 3.2 / 3.4 above. Screen-level tests: [src/__tests__/screens/login.test.tsx](src/__tests__/screens/login.test.tsx), [register.test.tsx](src/__tests__/screens/register.test.tsx), [forgot-password.test.tsx](src/__tests__/screens/forgot-password.test.tsx) (mocked `useAuthService`, user input, error states).
    - _Requirements: 1.1–1.14_


- [~] 4. Exam catalog, enrollment, and topic selection
  - [x] 4.1 Implement `EnrollmentGuard.canEnroll(activeExamIds: string[]): boolean` pure function — [src/domain/enrollment/EnrollmentGuard.ts](src/domain/enrollment/EnrollmentGuard.ts)
    - Return true iff active count < 5
    - _Requirements: 2.6_
  - [x] 4.2 Write property test for enrollment limit — [src/domain/enrollment/__tests__/canEnroll.property.test.ts](src/domain/enrollment/__tests__/canEnroll.property.test.ts)
    - **Property 3: Enrollment limit enforced at 5 active exams**
    - Use `fc.array(fc.string(), {maxLength: 10})` of exam IDs; verify canEnroll iff length < 5
    - Tag: `// Feature: servicenow-cert-study-app, Property 3`
    - **Validates: Requirements 2.6**
  - [x] 4.3 Implement `filterByDomain(questions: QuestionRecord[], domainId: string): QuestionRecord[]` pure function — [src/domain/enrollment/filterByDomain.ts](src/domain/enrollment/filterByDomain.ts)
    - Return only questions whose `domainId` matches the filter (schema uses one domain per question; matches Req 2.5 domain-scoped sessions)
    - _Requirements: 2.5_
  - [x] 4.4 Write property test for domain filter — [src/domain/enrollment/__tests__/filterByDomain.property.test.ts](src/domain/enrollment/__tests__/filterByDomain.property.test.ts)
    - **Property 4: Domain filter returns only matching questions**
    - Use `fc.array` of questions with random domain tags + `fc.string()` domain filter; verify all results match domain and no non-matching results included
    - Tag: `// Feature: servicenow-cert-study-app, Property 4`
    - **Validates: Requirements 2.5**
  - [x] 4.5 Build exam catalog screen (`app/(tabs)/catalog.tsx`)
    - Display exam name, certification level, and estimated study hours for all supported exams (Requirement 2.1)
    - Show topic domains, weighting percentages, and total question count on exam detail (Requirement 2.2)
    - Implement enroll action with `EnrollmentGuard`; show `EnrollmentLimitWarning` dialog when limit reached; handle enrollment system errors (Requirements 2.3, 2.4, 2.6)
    - Allow domain selection to filter subsequent sessions (Requirement 2.5) — persisted via AsyncStorage through [src/domain/catalog/domainSelectionStorage.ts](src/domain/catalog/domainSelectionStorage.ts)
    - _Requirements: 2.1–2.6_
  - [~] 4.6 Implement content update notification delivery for enrolled users
    - Detect new `content_update_notifications` records; notify enrolled users who have downloaded that exam's content; trigger content refresh within 24 hours (Requirement 2.7)
    - _Requirements: 2.7_
  - [x] 4.7 Write unit tests for enrollment guard, domain filter, and catalog screen
    - Property tests cover guard + filter; [src/__tests__/screens/catalog.test.tsx](src/__tests__/screens/catalog.test.tsx) covers enrollment limit dialog, enrollment error path, and domain filter control
    - _Requirements: 2.1–2.7_


- [ ] 5. Practice questions domain logic and quiz screen
  - [~] 5.1 Implement `validateQuestion(question: QuestionRecord): boolean` pure function
    - Verify `imageAltText` is a non-empty string for every question
    - _Requirements: 3.11_
  - [~] 5.2 Write property test for accessible description on every question
    - **Property 8: Every question has a non-empty accessible text description**
    - Use `fc.record` of question with optional image; verify `imageAltText` is non-empty string
    - Tag: `// Feature: servicenow-cert-study-app, Property 8`
    - **Validates: Requirements 3.11**
  - [~] 5.3 Implement `buildReviewQueue(questions: QuestionRecord[]): QuestionRecord[]` pure function
    - Include all incorrectly answered questions; exclude correctly-answered-only questions; sort descending by incorrect count
    - _Requirements: 3.5, 3.6_
  - [~] 5.4 Write property test for review queue completeness and ordering
    - **Property 5: Review queue contains all incorrect answers ordered by descending incorrect count**
    - Use `fc.array` of questions with random incorrect counts; verify all incorrect questions present, no correct-only questions, sorted descending
    - Tag: `// Feature: servicenow-cert-study-app, Property 5`
    - **Validates: Requirements 3.5, 3.6**
  - [~] 5.5 Implement `recordAttempt(question: QuestionRecord, answer: AnswerChoiceRecord)` domain function
    - Record attempt under every domain tag associated with the question
    - _Requirements: 3.4_
  - [~] 5.6 Write property test for domain attribution on answer
    - **Property 6: Quiz answer is attributed to all of the question's domain tags**
    - Use `fc.record` with `fc.array(fc.string())` domain arrays; verify all domains recorded
    - Tag: `// Feature: servicenow-cert-study-app, Property 6`
    - **Validates: Requirements 3.4**
  - [~] 5.7 Implement `QuizSessionManager`: `startSession`, `startBookmarkSession`, `submitAnswer` (with ≤500 ms feedback), `endSession`
    - Add incorrectly answered questions to the Review queue (Requirement 3.5)
    - Implement question pool reset when all questions answered at least once; notify user on reset (Requirements 3.8, 3.9)
    - _Requirements: 3.1–3.9_
  - [~] 5.8 Build `QuestionCard` shared component
    - Render question text, minimum 4 answer choices, image at full card width (Requirement 3.10)
    - Show correct/incorrect feedback within 500 ms with explanation (Requirement 3.2)
    - Include `accessibilityLabel` on all interactive elements; use `accessibilityLiveRegion` for feedback announcements (Requirement 10.1)
    - Include text label and icon alongside color-coded correct/incorrect indicators (Requirement 10.4)
    - _Requirements: 3.1, 3.2, 3.10, 3.11, 10.1, 10.4_
  - [~] 5.9 Write property test for minimum 4 answer choices per question
    - **Property 7: Every question rendered in a quiz has at least 4 answer choices**
    - Use `fc.record` of question with `fc.array(fc.record(), {minLength: 4})` choices; verify rendered card displays ≥4 choices
    - Tag: `// Feature: servicenow-cert-study-app, Property 7`
    - **Validates: Requirements 3.1**
  - [~] 5.10 Build quiz screen (`app/exam/[examId]/quiz.tsx`) and review queue screen (`app/exam/[examId]/review.tsx`)
    - Wire `QuizSessionManager`; display session summary on completion (Requirement 3.3)
    - Display Review queue ordered by descending incorrect count (Requirement 3.6)
    - _Requirements: 3.1–3.9_
  - [~] 5.11 Write unit tests for quiz session, review queue, and QuestionCard component
    - Test answer feedback timing, pool reset notification, empty review queue, image rendering
    - _Requirements: 3.1–3.11_


- [ ] 6. Flashcards and spaced repetition
  - [~] 6.1 Implement `validateFlashcard(term: string, definition: string): boolean` pure function
    - Reject if either field is empty or whitespace-only
    - _Requirements: 4.10_
  - [~] 6.2 Write property test for custom flashcard empty field rejection
    - **Property 9: Custom flashcard validation rejects empty or whitespace-only fields**
    - Use `fc.string()` including `fc.stringOf(fc.char(' '))` whitespace-only; verify rejection
    - Tag: `// Feature: servicenow-cert-study-app, Property 9`
    - **Validates: Requirements 4.10**
  - [~] 6.3 Implement `SpacedRepetitionEngine`: `computeNextInterval` and `getDueCards`
    - SM-2 algorithm: ease factor never falls below 1.3; "Still Learning" interval ≤ 50% of "Known" interval
    - _Requirements: 4.8_
  - [~] 6.4 Write property test for SRS interval ratio invariant
    - **Property 10: Spaced repetition interval ratio (Still Learning ≤ 50% of Known)**
    - Use `fc.record` of `FlashcardSRSState` + `fc.constantFrom(0,1,2)` vs `fc.constantFrom(3,4,5)`; verify ratio
    - Tag: `// Feature: servicenow-cert-study-app, Property 10`
    - **Validates: Requirements 4.8**
  - [~] 6.5 Write property test for SM-2 ease factor floor
    - **Property 11: SM-2 ease factor never falls below 1.3**
    - Use `fc.record` of `FlashcardSRSState` + `fc.integer({min:0,max:5})`, applied N times via `fc.array`; verify ease factor ≥ 1.3 after every repetition
    - Tag: `// Feature: servicenow-cert-study-app, Property 11`
    - **Validates: Requirements 4.8**
  - [~] 6.6 Implement `FlashcardSessionManager.swipeLeft` and `swipeRight` logic
    - `swipeRight`: mark "Known", remove from active pool (Requirement 4.5)
    - `swipeLeft`: mark "Still Learning", re-insert at position ≥ currentIndex + 3 (Requirement 4.6)
    - _Requirements: 4.5, 4.6_
  - [~] 6.7 Write property test for swipe-left re-insertion position
    - **Property 12: Swipe-left re-inserts card at least 3 positions ahead**
    - Use `fc.array` of cards with minLength 4; verify re-insertion index ≥ currentIndex + 3
    - Tag: `// Feature: servicenow-cert-study-app, Property 12`
    - **Validates: Requirements 4.6**
  - [~] 6.8 Build `FlashcardDeck` shared component using React Native Reanimated 3
    - Swipeable card stack; flip animation completing within 300 ms (Requirement 4.4)
    - Show term side by default; flip to definition on tap (Requirement 4.2)
    - Display empty-deck message with option to create flashcard when deck has no cards (Requirement 4.3)
    - _Requirements: 4.2–4.6_
  - [~] 6.9 Build flashcard screen (`app/exam/[examId]/flashcards.tsx`)
    - Display session summary (Known / Still Learning counts) on completion (Requirement 4.7)
    - Support custom flashcard creation with `validateFlashcard`; save to user-defined deck (Requirements 4.9, 4.10)
    - _Requirements: 4.1–4.10_
  - [~] 6.10 Write unit tests for SpacedRepetitionEngine, FlashcardSessionManager, and FlashcardDeck component
    - Test flip animation timing, empty deck state, custom flashcard validation errors, session summary
    - _Requirements: 4.1–4.10_


- [~] 7. Checkpoint — Core study features
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Exam simulator
  - [~] 8.1 Implement `buildConfirmationSummary(session: SimulatorSessionRecord)` pure function
    - Return exact count of unanswered questions and flagged questions
    - _Requirements: 5.5_
  - [~] 8.2 Write property test for simulator confirmation counts
    - **Property 13: Simulator submission confirmation counts are accurate**
    - Use `fc.record` of session with random answered/flagged states; verify counts match
    - Tag: `// Feature: servicenow-cert-study-app, Property 13`
    - **Validates: Requirements 5.5**
  - [~] 8.3 Implement `calculateSimulatorResult(session, questions)` pure function
    - Compute overall score percentage, pass/fail against official passing threshold, per-domain score breakdown, list of incorrectly answered questions with explanations
    - _Requirements: 5.6_
  - [~] 8.4 Write property test for simulator results calculation
    - **Property 14: Simulator results calculation is correct**
    - Use `fc.array` of answer records; verify score, pass/fail, domain breakdown, and incorrect question list are all correct
    - Tag: `// Feature: servicenow-cert-study-app, Property 14`
    - **Validates: Requirements 5.6**
  - [~] 8.5 Implement `ExamSimulatorController`: `startSimulator`, `flagQuestion`, `unflagQuestion`, `submitSimulator`, `pauseSimulator`, `resumeSimulator`
    - Countdown timer updates every second; auto-submit on expiry (Requirements 5.1, 5.2, 5.4)
    - Pause timer and persist state on app background; restore on return (Requirement 5.8)
    - Handle unrestorable state: display error and offer restart or discard (Requirement 5.9)
    - Store results for minimum 90 days (Requirement 5.7)
    - _Requirements: 5.1–5.9_
  - [~] 8.6 Build `TimerDisplay` shared component
    - Fixed-position countdown; always visible without scrolling; updates every second
    - Include `accessibilityLabel` and `accessibilityLiveRegion` for screen readers
    - _Requirements: 5.2, 10.1_
  - [~] 8.7 Build simulator screen (`app/exam/[examId]/simulator.tsx`)
    - Wire `ExamSimulatorController`; show confirmation dialog before manual submission (Requirement 5.5)
    - Display full results report after submission (Requirement 5.6)
    - _Requirements: 5.1–5.9_
  - [~] 8.8 Write unit tests for ExamSimulatorController and simulator screen
    - Test auto-submit on timer expiry, pause/resume, unrestorable state error, confirmation dialog counts, results report
    - _Requirements: 5.1–5.9_


- [ ] 9. Progress tracking and analytics
  - [~] 9.1 Implement `ReadinessScoreCalculator.calculate(sessions, domainWeights)` pure function
    - Use only sessions completed within the last 30 days; weight by domain importance; cap result at 100
    - _Requirements: 6.4, 6.5_
  - [~] 9.2 Write property test for readiness score bounds and session filtering
    - **Property 15: Readiness score is bounded in [0, 100] and ignores sessions older than 30 days**
    - Use `fc.array` of sessions with dates spanning > 30 days + domain weights; verify result in [0, 100] and equals score with only recent sessions
    - Tag: `// Feature: servicenow-cert-study-app, Property 15`
    - **Validates: Requirements 6.4, 6.5**
  - [~] 9.3 Implement `StreakTracker.compute(sessionDates, today)` pure function
    - Increment by 1 per distinct calendar day (local timezone) with a session; reset to 0 on missed day
    - _Requirements: 6.7_
  - [~] 9.4 Write property test for streak tracking
    - **Property 17: Streak increments exactly once per calendar day with a session, resets on missed day**
    - Use `fc.array(fc.date())` of session timestamps; verify streak matches expected calendar-day count
    - Tag: `// Feature: servicenow-cert-study-app, Property 17`
    - **Validates: Requirements 6.7**
  - [~] 9.5 Implement `Progress_Tracker` data recording
    - Record score, date, and duration for every session where user submits all questions or explicitly ends the session (Requirement 6.1)
    - _Requirements: 6.1_
  - [~] 9.6 Build `DomainAccuracyChart`, `ProgressRing`, and `StudyCalendar` shared components
    - `DomainAccuracyChart`: bar chart with text labels alongside color coding (no color-only indicators) (Requirements 6.2, 10.4)
    - `ProgressRing`: circular readiness score 0–100 with text label (Requirement 6.5)
    - `StudyCalendar`: highlight days with at least one completed session (Requirement 6.3)
    - All components include `accessibilityLabel` and `accessibilityRole` (Requirement 10.1)
    - _Requirements: 6.2, 6.3, 6.5, 10.1, 10.4_
  - [~] 9.7 Build progress dashboard screen (`app/(tabs)/progress.tsx`)
    - Display per-domain accuracy chart, study activity calendar, readiness score, and readiness-80 notification trigger (Requirements 6.2–6.6)
    - Display empty-state message when no session data exists (Requirement 6.9)
    - _Requirements: 6.2–6.6, 6.9_
  - [~] 9.8 Build profile screen (`app/(tabs)/profile.tsx`)
    - Display current streak, longest streak, total questions answered, total study sessions (Requirement 6.8)
    - _Requirements: 6.8_
  - [~] 9.9 Write unit tests for ReadinessScoreCalculator, StreakTracker, progress dashboard, and profile screen
    - Test empty-state message, readiness-80 notification trigger, streak reset, score capping at 100
    - _Requirements: 6.1–6.9_


- [ ] 10. Bookmarks and review lists
  - [~] 10.1 Implement `BookmarkService`: `toggleBookmark`, `getBookmarksForExam`, `sortByDateDescending`, `groupByExam`
    - Toggle is idempotent (involution): double-toggle restores original state
    - _Requirements: 7.1–7.4_
  - [~] 10.2 Write property test for bookmark toggle involution
    - **Property 18: Bookmark toggle is an involution**
    - Use `fc.record` of item + `fc.boolean()` initial state; verify double-toggle restores original state and bookmark list is unchanged
    - Tag: `// Feature: servicenow-cert-study-app, Property 18`
    - **Validates: Requirements 7.1, 7.2**
  - [~] 10.3 Write property test for bookmark list grouping and sort order
    - **Property 19: Bookmark list is grouped by exam and sorted by date descending**
    - Use `fc.array` of bookmarks with random examIds and timestamps; verify grouping and descending sort within each group
    - Tag: `// Feature: servicenow-cert-study-app, Property 19`
    - **Validates: Requirements 7.3**
  - [~] 10.4 Write property test for bookmark session exam filter
    - **Property 20: Bookmark session presents only items for the selected exam**
    - Use `fc.array` of bookmarks with multiple examIds; verify only selected exam's bookmarks returned
    - Tag: `// Feature: servicenow-cert-study-app, Property 20`
    - **Validates: Requirements 7.4**
  - [~] 10.5 Build `BookmarkButton` shared component
    - Animated icon transitioning between active/inactive states within 500 ms (Requirements 7.1, 7.2)
    - Include `accessibilityLabel` reflecting current state (Requirement 10.1)
    - _Requirements: 7.1, 7.2, 10.1_
  - [~] 10.6 Build bookmarks screen (`app/bookmarks.tsx`)
    - Display bookmarks grouped by exam, sorted most-recent-first (Requirement 7.3)
    - Start Quiz or Flashcard session from bookmark list; show empty-state message when no bookmarks for selected exam (Requirements 7.4, 7.5)
    - Implement cross-device sync within 30 seconds via WatermelonDB + Neon (Worker `push_changes` / `pull_changes` RPCs) (Requirement 7.6)
    - _Requirements: 7.1–7.6_
  - [~] 10.7 Write unit tests for BookmarkService and bookmarks screen
    - Test bookmark toggle state transitions, empty-state message, session start prevention with no bookmarks
    - _Requirements: 7.1–7.6_


- [~] 11. Checkpoint — Study features complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Notifications and study reminders
  - [~] 12.1 Implement `NotificationScheduler` pure logic functions: `computeReminderFireTime`, `rescheduleForQuietHours`, `shouldSendStreakRisk`, `shouldSendCongratulatory`, `shouldSendReadiness80`
    - Quiet hours window must be ≤ 12 consecutive hours; reschedule to first minute after quiet hours end (Requirement 8.4)
    - Congratulatory: fire on ≥10-point increase since last notification or enrollment; max once per 24 hours per exam (Requirement 8.3)
    - Readiness-80: fire exactly at qualifying score transitions (first reach of 80, or re-reach after dropping below 80) (Requirement 6.6)
    - _Requirements: 8.1–8.4, 6.6_
  - [~] 12.2 Write property test for quiet-hours rescheduling
    - **Property 21: Notification quiet-hours rescheduling never fires during quiet hours**
    - Use `fc.record` of times within quiet window; verify output ≥ quietEnd and never within quiet window
    - Tag: `// Feature: servicenow-cert-study-app, Property 21`
    - **Validates: Requirements 8.4**
  - [~] 12.3 Write property test for congratulatory notification trigger
    - **Property 22: Congratulatory notification fires exactly on qualifying readiness score increases**
    - Use `fc.array` of score/timestamp pairs; verify fires exactly on ≥10-point increases, max once per 24h per exam
    - Tag: `// Feature: servicenow-cert-study-app, Property 22`
    - **Validates: Requirements 8.3**
  - [~] 12.4 Write property test for readiness-80 notification transitions
    - **Property 16: Readiness-80 notification fires exactly at qualifying score transitions**
    - Use `fc.array` of score/timestamp pairs crossing 80 threshold; verify fires exactly at qualifying transitions, not more than once per qualifying crossing
    - Tag: `// Feature: servicenow-cert-study-app, Property 16`
    - **Validates: Requirements 6.6**
  - [~] 12.5 Integrate `expo-notifications` for scheduling, permission handling, and deep-link routing
    - Request permissions on first launch; detect denied/revoked permissions and show in-app prompt (Requirement 8.5)
    - Route notification taps to correct screens: daily reminder → home, streak-risk → active study list, congratulatory → progress dashboard (Requirement 8.6)
    - _Requirements: 8.1–8.6_
  - [~] 12.6 Build notification settings UI in profile screen
    - Configure daily reminder time, enable/disable each notification type individually, set quiet hours (Requirement 8.4)
    - _Requirements: 8.4_
  - [~] 12.7 Write unit tests for NotificationScheduler and notification settings UI
    - Test streak-risk trigger at 8 PM, quiet hours rescheduling, permission-denied in-app prompt, deep-link routing for each notification type
    - _Requirements: 8.1–8.6_


- [ ] 13. Offline access and sync
  - [~] 13.1 Implement `ContentStalenessChecker.isStale(downloadedAt: Date, today: Date): boolean` pure function
    - Return true iff (today − downloadedAt) > 30 days
    - _Requirements: 9.8_
  - [~] 13.2 Write property test for stale content detection
    - **Property 24: Stale content warning fires for content older than 30 days**
    - Use `fc.date()` for downloadedAt; verify isStale iff (today − downloadedAt) > 30 days; content ≤ 30 days old must not trigger warning
    - Tag: `// Feature: servicenow-cert-study-app, Property 24`
    - **Validates: Requirements 9.8**
  - [~] 13.3 Implement `OfflineSyncQueue`: `enqueue`, `flush`, `getPendingCount`, `retryOnReconnect`
    - Queue all progress updates locally while offline; begin sync within 60 seconds of stable reconnect (≥5 consecutive seconds); retry on interruption (Requirements 9.4–9.6)
    - _Requirements: 9.4–9.6_
  - [~] 13.4 Write property test for offline queue retry behavior
    - **Property 23: Offline progress updates are fully queued and retried until synchronized**
    - Use `fc.array` of progress updates; simulate interruption; verify queue retried on reconnect and all updates eventually synchronized
    - Tag: `// Feature: servicenow-cert-study-app, Property 23`
    - **Validates: Requirements 9.4, 9.5, 9.6**
  - [~] 13.5 Implement exam content download using Expo FileSystem
    - Store all questions, flashcards, and decks for an exam on device (Requirement 9.1)
    - Check available storage before download; display required vs. available space and halt without partial content on insufficient storage (Requirement 9.2)
    - _Requirements: 9.1, 9.2_
  - [~] 13.6 Build `OfflineBanner` and `ContentStaleWarning` shared components
    - `OfflineBanner`: persistent header label when `NetInfo.isConnected === false` (Requirement 9.7)
    - `ContentStaleWarning`: banner when downloaded content is > 30 days old (Requirement 9.8)
    - Both include `accessibilityLabel` and `accessibilityLiveRegion` (Requirement 10.1)
    - _Requirements: 9.7, 9.8, 10.1_
  - [~] 13.7 Wire offline detection and sync into the root layout
    - Monitor `NetInfo`; show `OfflineBanner`; trigger `OfflineSyncQueue.retryOnReconnect` on reconnect; show `ContentStaleWarning` for stale downloads
    - _Requirements: 9.3–9.8_
  - [~] 13.8 Write unit tests for ContentStalenessChecker, OfflineSyncQueue, and offline UI components
    - Test insufficient storage error, offline banner visibility, stale content warning, sync retry on reconnect
    - _Requirements: 9.1–9.8_


- [ ] 14. Accessibility implementation
  - [~] 14.1 Implement `HighContrastThemeProvider` and `highContrastTheme` color map
    - Apply high-contrast theme to all screens within 500 ms of activation (Requirement 10.5)
    - All foreground/background color pairs must meet WCAG 2.1 AA contrast ratio ≥ 4.5:1 (Requirement 10.3)
    - _Requirements: 10.3, 10.5_
  - [~] 14.2 Write property test for high-contrast color contrast ratios
    - **Property 26: High-contrast theme color pairs meet WCAG 2.1 AA contrast ratio**
    - Enumerate all foreground/background pairs in `highContrastTheme`; compute WCAG contrast ratio; verify ≥ 4.5:1 for each pair
    - Tag: `// Feature: servicenow-cert-study-app, Property 26`
    - **Validates: Requirements 10.3**
  - [~] 14.3 Implement `ScaledText` component
    - Respect Dynamic Type (iOS) and font scaling (Android) from 100% to 200% without truncation, clipping, or overlap
    - _Requirements: 10.2_
  - [~] 14.4 Audit all interactive elements across all screens for accessibility compliance
    - Verify every button, input, card, and icon has a non-empty `accessibilityLabel` describing its purpose
    - Verify `accessibilityRole` is set appropriately on all interactive elements
    - Verify dynamic content changes use `accessibilityLiveRegion`
    - Verify all color-coded indicators include both a text label and an icon (no color-only information)
    - _Requirements: 10.1, 10.4_
  - [~] 14.5 Write property test for accessibility labels on interactive elements
    - **Property 25: Every interactive element has a non-empty accessibility label**
    - Render each shared component; verify `accessibilityLabel` is a non-empty string on all interactive elements
    - Tag: `// Feature: servicenow-cert-study-app, Property 25`
    - **Validates: Requirements 10.1**
  - [~] 14.6 Write unit tests for accessibility compliance
    - Test high-contrast theme application timing (≤500 ms), ScaledText at 100%/150%/200% font scale, color-coded indicators include text label and icon
    - _Requirements: 10.1–10.5_


- [ ] 15. Home screen and final integration
  - [~] 15.1 Build home screen (`app/(tabs)/index.tsx`)
    - Display active study list with enrolled exams and quick-access actions (quiz, flashcards, simulator)
    - Show readiness score ring and current streak for each enrolled exam
    - _Requirements: 2.3, 6.4, 6.7_
  - [x] 15.2 Wire root layout auth guard (`app/_layout.tsx`)
    - Inner `RootStack` runs inside `ClerkProvider`, reads `useAuth()`, and uses `useSegments` + `router.replace` to bounce unauthenticated users out of protected groups and authenticated users out of `(auth)`. Shows an `ActivityIndicator` splash until Clerk hydrates. — [app/_layout.tsx](app/_layout.tsx)
    - `app/index.tsx` does the initial redirect based on `useAuth().isSignedIn` so users don't see a flash of `(tabs)` before being kicked back. — [app/index.tsx](app/index.tsx)
    - 30-day session lifetime is enforced by Clerk dashboard config, not code.
    - _Requirements: 1.6, 1.14_
  - [~] 15.3 Wire Zustand stores to connect all domain services, repositories, and UI screens
    - Ensure all state (auth, enrollment, quiz, flashcard, simulator, progress, bookmarks, notifications, offline) flows correctly through the store layer
    - _Requirements: all_
  - [~] 15.4 Write integration tests for critical end-to-end flows
    - WatermelonDB sync round-trip with a locally-running Hono Worker pointed at a Neon branch database
    - Exam simulator pause/resume state persistence
    - Bookmark sync across devices within 30 seconds
    - Offline download and content availability check
    - Sync begins within 60 seconds of stable reconnect
    - _Requirements: 5.8, 7.6, 9.1–9.6_

- [~] 16. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.


## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Checkpoints at tasks 7, 11, and 16 ensure incremental validation
- Property-based tests (fast-check, minimum 100 iterations each) validate universal correctness guarantees; unit tests validate specific examples and edge cases
- All property tests must be tagged with `// Feature: servicenow-cert-study-app, Property N`
- The design uses TypeScript throughout; all code examples and implementations use TypeScript with strict mode enabled
- Full WCAG 2.1 AA validation requires manual testing with assistive technologies and expert accessibility review in addition to the automated tests in task 14


## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1"] },
    { "id": 1, "tasks": ["2.2", "2.3", "2.4"] },
    { "id": 2, "tasks": ["3.1", "3.3", "4.1", "4.3", "5.1", "5.3", "5.5", "6.1", "6.3", "6.6", "8.1", "8.3", "9.1", "9.3", "10.1", "12.1", "13.1", "13.3"] },
    { "id": 3, "tasks": ["3.2", "3.4", "4.2", "4.4", "5.2", "5.4", "5.6", "6.2", "6.4", "6.5", "6.7", "8.2", "8.4", "9.2", "9.4", "10.2", "10.3", "10.4", "12.2", "12.3", "12.4", "13.2", "13.4"] },
    { "id": 4, "tasks": ["3.5", "4.5", "5.7", "6.8", "8.5", "8.6", "9.5", "13.5"] },
    { "id": 5, "tasks": ["3.6", "4.6", "5.8", "6.9", "8.7", "9.6", "9.7", "9.8", "10.5", "12.5", "13.6", "13.7", "14.1", "14.3"] },
    { "id": 6, "tasks": ["3.7", "4.7", "5.9", "5.10", "6.10", "8.8", "9.9", "10.6", "10.7", "12.6", "13.8", "14.2", "14.4"] },
    { "id": 7, "tasks": ["5.11", "12.7", "14.5", "14.6", "15.1", "15.2"] },
    { "id": 8, "tasks": ["15.3"] },
    { "id": 9, "tasks": ["15.4"] }
  ]
}
```
