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


- [x] 4. Exam catalog, enrollment, and topic selection
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
  - [x] 4.6 Implement content update notification delivery for enrolled users
    - Detect new `content_update_notifications` records; notify enrolled users who have downloaded that exam's content; trigger content refresh within 24 hours (Requirement 2.7)
    - **Pure decision** `planContentUpdateDeliveries(notifications, exams, now)` — [src/domain/catalog/contentUpdateDelivery.ts](src/domain/catalog/contentUpdateDelivery.ts) — returns a delivery only when the exam is enrolled, downloaded for offline use, and the published `contentVersion` differs from the device's; each delivery carries a `refreshDeadline = now + 24h` (`CONTENT_REFRESH_WINDOW_MS`).
    - **Orchestrator** `processContentUpdates(deps)` in the same file lists unsent notifications + exams, plans deliveries, then per delivery: `refreshContent` → `exams.markContentDownloaded` → `markNotified` → `notify`. A notification is only marked sent **after** its refresh succeeds, so an offline/failed run is safely retried on the next pass (returns `{ delivered, failures }`).
    - **Wired** into [src/domain/catalog/useCatalog.ts](src/domain/catalog/useCatalog.ts): `refresh()` runs the processor before reading the catalog and exposes `contentUpdates` + `dismissContentUpdate`. The catalog screen ([app/(tabs)/catalog.tsx](app/(tabs)/catalog.tsx)) renders an accessible, dismissible content-update banner per delivery.
    - **Resolved (Task 16.10):** `useCatalog` now injects `refreshContent: (examId) => downloadExamContent(examId, defaultDownloadDeps)`, so this delivery path re-downloads the real Expo FileSystem bundle on a content update. The no-op default remains only for callers that don't supply the seam.
    - Tests: [src/domain/catalog/__tests__/contentUpdateDelivery.test.ts](src/domain/catalog/__tests__/contentUpdateDelivery.test.ts) (10 cases: plan eligibility matrix + orchestrator happy path, safe-retry on refresh failure, no-op) and a catalog screen banner/dismiss test. Full suite: 82/82 passing; `tsc --noEmit` clean.
    - _Requirements: 2.7_
  - [x] 4.7 Write unit tests for enrollment guard, domain filter, and catalog screen
    - Property tests cover guard + filter; [src/__tests__/screens/catalog.test.tsx](src/__tests__/screens/catalog.test.tsx) covers enrollment limit dialog, enrollment error path, and domain filter control
    - _Requirements: 2.1–2.7_


- [x] 5. Practice questions domain logic and quiz screen
  - **Domain layer lives in [src/domain/practice/](src/domain/practice/)** (barrel: [index.ts](src/domain/practice/index.ts), shared types: [types.ts](src/domain/practice/types.ts)). The barrel deliberately re-exports only pure functions, the manager, and types — never the `use*` hooks — so importing it (e.g. from `QuestionCard`) never pulls WatermelonDB into a render test. Full suite after this task: **121/121 passing**, `tsc --noEmit` clean.
  - [x] 5.1 Implement `validateQuestion(question: QuestionRecord): boolean` pure function — [src/domain/practice/validateQuestion.ts](src/domain/practice/validateQuestion.ts)
    - Returns true iff `imageAltText` has a non-whitespace character (whitespace-only treated as empty, consistent with `validateFlashcard`).
    - _Requirements: 3.11_
  - [x] 5.2 Write property test for accessible description on every question — [validateQuestion.property.test.ts](src/domain/practice/__tests__/validateQuestion.property.test.ts)
    - **Property 8** — 200-iteration `fc.string()` test asserting validity equals `imageAltText.trim().length > 0`, plus empty/whitespace/image-less boundary cases.
    - Tag: `// Feature: servicenow-cert-study-app, Property 8`
    - **Validates: Requirements 3.11**
  - [x] 5.3 Implement `buildReviewQueue` pure function — [src/domain/practice/buildReviewQueue.ts](src/domain/practice/buildReviewQueue.ts)
    - Generic over `{ incorrectCount }`; filters `incorrectCount > 0`, sorts descending (non-mutating — operates on the filtered copy).
    - _Requirements: 3.5, 3.6_
  - [x] 5.4 Write property test for review queue completeness and ordering — [buildReviewQueue.property.test.ts](src/domain/practice/__tests__/buildReviewQueue.property.test.ts)
    - **Property 5** — 200-iteration test verifying no correct-only entries, all incorrect entries present, descending order, plus non-mutation + empty cases.
    - Tag: `// Feature: servicenow-cert-study-app, Property 5`
    - **Validates: Requirements 3.5, 3.6**
  - [x] 5.5 Implement `recordAttempt(question, answer)` domain function — [src/domain/practice/recordAttempt.ts](src/domain/practice/recordAttempt.ts)
    - Pure: returns one attribution per **distinct** `domainId` (de-duplicated, never a subset). The WatermelonDB schema stores one domain per question, so the live quiz passes `[question.domainId]`; the function is general for the Progress_Tracker (task 9).
    - _Requirements: 3.4_
  - [x] 5.6 Write property test for domain attribution on answer — [recordAttempt.property.test.ts](src/domain/practice/__tests__/recordAttempt.property.test.ts)
    - **Property 6** — 200-iteration `fc.array(fc.string())` domain test verifying every distinct domain is covered with matching answer id/correctness; empty + duplicate cases.
    - Tag: `// Feature: servicenow-cert-study-app, Property 6`
    - **Validates: Requirements 3.4**
  - [x] 5.7 Implement `QuizSessionManager` — [src/domain/practice/QuizSessionManager.ts](src/domain/practice/QuizSessionManager.ts)
    - `startSession` (domain-filtered), `startBookmarkSession`, `submitAnswer`, `endSession`. Repos injected via `QuizSessionManagerDeps` (testable with fakes); in-memory per-`sessionId` state, persistence through the study-session/attempt/question repos.
    - Incorrect answers are recorded as attempts → that **is** Review-queue membership (Req 3.5), since the queue derives from incorrect attempts. Answer grading is local (no network) → well within the 500 ms budget (Req 3.2, asserted in tests).
    - Pool reset (Req 3.8): when no eligible question remains (`timesAnswered === 0 || isPoolReset`), `resetPool` is called and `poolWasReset` is flagged for the UI notice (Req 3.9).
    - **Known limitation:** `durationSeconds` is written as `0` at create and not updated (the `StudySessionRepository.complete` interface only takes score/correct/completedAt). Real duration recording is part of Progress_Tracker (task 9.5).
    - _Requirements: 3.1–3.9_
  - [x] 5.8 Build `QuestionCard` shared component — [src/ui/QuestionCard.tsx](src/ui/QuestionCard.tsx)
    - Question text, full-width image when present (Req 3.10), all provided choices, ≤500 ms feedback + explanation announced via `accessibilityLiveRegion` (Req 3.2/10.1). Correct/incorrect conveyed by **text label + ✓/✗ icon**, not color alone (Req 10.4). Each choice carries a stateful `accessibilityLabel`.
    - _Requirements: 3.1, 3.2, 3.10, 3.11, 10.1, 10.4_
  - [x] 5.9 Write property test for minimum 4 answer choices per question — [QuestionCard.property.test.tsx](src/ui/__tests__/QuestionCard.property.test.tsx)
    - **Property 7** — renders `QuestionCard` with `fc` choices (minLength 4) and asserts the rendered `answer-choice` count is ≥4 and equals input (50 runs; render is heavier than pure fns).
    - Tag: `// Feature: servicenow-cert-study-app, Property 7`
    - **Validates: Requirements 3.1**
  - [x] 5.10 Build quiz + review screens
    - [app/exam/[examId]/quiz.tsx](app/exam/[examId]/quiz.tsx) via [useQuiz.ts](src/domain/practice/useQuiz.ts): one-at-a-time flow, pool-reset banner, end-of-session summary with score % / counts / per-domain breakdown (Req 3.3); supports `?mode=bookmark`.
    - [app/exam/[examId]/review.tsx](app/exam/[examId]/review.tsx) via [useReviewQueue.ts](src/domain/practice/useReviewQueue.ts): lists missed questions in the repo's descending-incorrect order (Req 3.6) with empty/error/refresh states.
    - _Requirements: 3.1–3.9_
  - [x] 5.11 Write unit tests for quiz session, review queue, and QuestionCard
    - [QuizSessionManager.test.ts](src/domain/practice/__tests__/QuizSessionManager.test.ts) (pool exclusion/reset, grading, ≤500 ms timing, summary/breakdown, bookmark session), [QuestionCard.test.tsx](src/ui/__tests__/QuestionCard.test.tsx) (feedback text+icon, image rendering, disabled-after-answer, a11y labels), and screen tests [quiz.test.tsx](src/__tests__/screens/quiz.test.tsx) / [review.test.tsx](src/__tests__/screens/review.test.tsx) (mocked hooks, summary, empty review queue).
    - _Requirements: 3.1–3.11_


- [x] 6. Flashcards and spaced repetition
  - **Domain layer in [src/domain/flashcards/](src/domain/flashcards/)** (barrel: [index.ts](src/domain/flashcards/index.ts), types: [types.ts](src/domain/flashcards/types.ts)). As with `practice`, the barrel exports only pure logic + types — not the `useFlashcards` hook — so importing it never drags WatermelonDB into a render test. Jest now mocks Reanimated + gesture-handler in [jest.setup.ts](jest.setup.ts) (self-contained Reanimated mock with a stable `useSharedValue` ref). Full suite after this task: **146/146 passing**, `tsc --noEmit` clean.
  - [x] 6.1 Implement `validateFlashcard(term, definition): boolean` — [src/domain/flashcards/validateFlashcard.ts](src/domain/flashcards/validateFlashcard.ts)
    - Both fields must contain a non-whitespace character.
    - _Requirements: 4.10_
  - [x] 6.2 Write property test for custom flashcard empty field rejection — [validateFlashcard.property.test.ts](src/domain/flashcards/__tests__/validateFlashcard.property.test.ts)
    - **Property 9** — 300-iteration test (incl. whitespace-only generator) asserting validity equals `term.trim() && definition.trim()`; explicit empty/whitespace cases.
    - Tag: `// Feature: servicenow-cert-study-app, Property 9`
    - **Validates: Requirements 4.10**
  - [x] 6.3 Implement `SpacedRepetitionEngine`: `computeNextInterval` + `getDueCards` — [src/domain/flashcards/SpacedRepetitionEngine.ts](src/domain/flashcards/SpacedRepetitionEngine.ts)
    - SM-2 ease update clamped at 1.3 every call. **Known interval is computed from the card's current ease factor (identical for all passing qualities 3–5); Still Learning interval = `floor(knownInterval / 2)`** — this is the design choice that makes the ≤50% ratio hold for *every* card, including fresh ones (Known base kept ≥ 2 days so the half is ≥ 1). Epoch-ms timestamps to match `FlashcardDTO`.
    - _Requirements: 4.8_
  - [x] 6.4 Write property test for SRS interval ratio invariant — [srsIntervalRatio.property.test.ts](src/domain/flashcards/__tests__/srsIntervalRatio.property.test.ts)
    - **Property 10** — 300 iters, `still∈{0,1,2}` vs `known∈{3,4,5}` on the same card; asserts `still.intervalDays ≤ 0.5 * known.intervalDays`.
    - Tag: `// Feature: servicenow-cert-study-app, Property 10`
    - **Validates: Requirements 4.8**
  - [x] 6.5 Write property test for SM-2 ease factor floor — [srsEaseFactor.property.test.ts](src/domain/flashcards/__tests__/srsEaseFactor.property.test.ts)
    - **Property 11** — 300 iters applying a random 1–40 length quality sequence; asserts ease ≥ 1.3 after every repetition.
    - Tag: `// Feature: servicenow-cert-study-app, Property 11`
    - **Validates: Requirements 4.8**
  - [x] 6.6 Implement `FlashcardSessionManager.swipeLeft`/`swipeRight` — [src/domain/flashcards/FlashcardSessionManager.ts](src/domain/flashcards/FlashcardSessionManager.ts)
    - Pure pool reordering. `swipeRight` removes the card (Req 4.5); `swipeLeft` re-inserts at `min(currentIndex + 3, rest.length)` (Req 4.6).
    - _Requirements: 4.5, 4.6_
  - [x] 6.7 Write property test for swipe-left re-insertion position — [swipeLeft.property.test.ts](src/domain/flashcards/__tests__/swipeLeft.property.test.ts)
    - **Property 12** — 300 iters with ≥4 unique cards and in-range `currentIndex`; asserts the re-inserted card lands at index ≥ `currentIndex + 3` with no loss/dup; plus clamp + swipeRight cases.
    - Tag: `// Feature: servicenow-cert-study-app, Property 12`
    - **Validates: Requirements 4.6**
  - [x] 6.8 Build `FlashcardDeck` shared component (Reanimated 3) — [src/ui/FlashcardDeck.tsx](src/ui/FlashcardDeck.tsx)
    - Reanimated flip (`FLIP_DURATION_MS = 300`, Req 4.4), term shown by default → definition on tap (Req 4.2), gesture-handler Pan for left/right swipe **plus accessible "Known"/"Still learning" buttons** (Req 10.1, and the path tests exercise), empty-deck message + "Create a flashcard" (Req 4.3).
    - _Requirements: 4.2–4.6_
  - [x] 6.9 Build flashcard screen + `useFlashcards` hook — [app/exam/[examId]/flashcards.tsx](app/exam/[examId]/flashcards.tsx), [useFlashcards.ts](src/domain/flashcards/useFlashcards.ts)
    - Deck picker, live Known/Still/remaining counts, end-of-session summary (Req 4.7). Swipes persist SM-2 state via `upsertSRSState` (Known→q5, Still→q1). Custom-card modal validates with `validateFlashcard`, auto-creates a "My cards" custom deck if none exists, then saves (Req 4.9, 4.10).
    - _Requirements: 4.1–4.10_
  - [x] 6.10 Write unit tests — [SpacedRepetitionEngine.test.ts](src/domain/flashcards/__tests__/SpacedRepetitionEngine.test.ts), [FlashcardDeck.test.tsx](src/ui/__tests__/FlashcardDeck.test.tsx), [flashcards.test.tsx](src/__tests__/screens/flashcards.test.tsx)
    - Engine interval/ease/due cases; flip timing, empty-deck state, flip-to-definition, Known/Still buttons; screen summary, add-card flow, validation error surfacing.
    - _Requirements: 4.1–4.10_


- [x] 7. Checkpoint — Core study features
  - Ensure all tests pass, ask the user if questions arise.
  - **All gates green:** `pnpm test` 146/146 (27 suites), `pnpm typecheck` clean, `pnpm lint` clean.
  - **Fixed repo-wide lint:** ESLint v9 required flat config but the project still had a legacy `.eslintrc.js` (lint had been failing to run since project setup). Migrated to [eslint.config.js](eslint.config.js) — bridges the still-legacy `expo` + `prettier` shareable configs via `@eslint/eslintrc` `FlatCompat` and preserves the original rules (`no-unused-vars` w/ `^_`, `no-explicit-any` warn, `consistent-type-imports`, `no-console`). Removed `.eslintrc.js`.
  - **Lint findings fixed:** duplicate barrel exports in [src/db/repositories/index.ts](src/db/repositories/index.ts) (explicit `export type {…}` block was redundant with `export * from './types'`); a `consistent-type-imports` split in the content-update test; autofixed `array-type` + stale `eslint-disable` directives; added a display name to the Reanimated test mock.

- [x] 8. Exam simulator
  - **Domain layer in [src/domain/simulator/](src/domain/simulator/)** (barrel: [index.ts](src/domain/simulator/index.ts), types: [types.ts](src/domain/simulator/types.ts)) — exports pure fns + controller + types, never the `useSimulator` hook. Full suite after this task: **167/167 passing**, `tsc --noEmit` + `eslint` clean.
  - [x] 8.1 Implement `buildConfirmationSummary` pure function — [buildConfirmationSummary.ts](src/domain/simulator/buildConfirmationSummary.ts)
    - Counts unanswered (no non-empty answer id) + flagged (de-duped, restricted to the session's own questions). Takes a structural `{ questions, answers, flaggedQuestions }` input so it's trivially testable.
    - _Requirements: 5.5_
  - [x] 8.2 Write property test for simulator confirmation counts — [buildConfirmationSummary.property.test.ts](src/domain/simulator/__tests__/buildConfirmationSummary.property.test.ts)
    - **Property 13** — 300 iters over random answered/flagged states; asserts exact unanswered + flagged counts; plus a stale-flag-id case.
    - Tag: `// Feature: servicenow-cert-study-app, Property 13`
    - **Validates: Requirements 5.5**
  - [x] 8.3 Implement `calculateSimulatorResult(session, questions)` pure function — [calculateSimulatorResult.ts](src/domain/simulator/calculateSimulatorResult.ts)
    - Score is over **every presented question** (unanswered = incorrect, exam conditions). One "not correct" predicate drives score, per-domain breakdown, and the incorrect list (which therefore includes unanswered questions for review). Pass = score ≥ `officialPassingScore`.
    - _Requirements: 5.6_
  - [x] 8.4 Write property test for simulator results calculation — [calculateSimulatorResult.property.test.ts](src/domain/simulator/__tests__/calculateSimulatorResult.property.test.ts)
    - **Property 14** — 300 iters with correct/wrong/unanswered records + random threshold; independently verifies score, pass/fail, per-domain breakdown, and the incorrect-id set.
    - Tag: `// Feature: servicenow-cert-study-app, Property 14`
    - **Validates: Requirements 5.6**
  - [x] 8.5 Implement `ExamSimulatorController` — [ExamSimulatorController.ts](src/domain/simulator/ExamSimulatorController.ts)
    - `startSimulator` (timer = `officialDurationMinutes`, `expiresAt = startedAt + 90d` for Req 5.7), `answerQuestion`, `flagQuestion`/`unflagQuestion` (Req 5.3), `submitSimulator` (grades + persists submitted row + records a completed `study_sessions` row for analytics), `pauseSimulator` (persists `paused` + remaining time, Req 5.8), `findResumableSession` + `resumeSimulator` (rebuilds the question set from the pool; throws `SimulatorRestoreError` if the exam/pool no longer matches → Req 5.9), `discardSession`.
    - **Design deviations (noted):** the countdown + auto-submit live in `useSimulator`, not the controller (the controller owns lifecycle/persistence). Because the `simulator_sessions` row persists answers/flags/remaining but **not** the question list, the presented set is the first `officialQuestionCount` of the pool in **repository order (no shuffle by default)** so a paused session is deterministically rebuildable; `resumeSimulator` takes the persisted DTO (via `findResumableSession`) rather than a bare `sessionId`, and an `answerQuestion` method was added (not in the design interface) since answers must be captured.
    - _Requirements: 5.1–5.9_
  - [x] 8.6 Build `TimerDisplay` shared component — [src/ui/TimerDisplay.tsx](src/ui/TimerDisplay.tsx)
    - Fixed top bar (`accessibilityRole="timer"`, `accessibilityLiveRegion`), `formatRemaining` → mm:ss (clamped ≥ 0), final-stretch warning styling. Parent drives the per-second value.
    - _Requirements: 5.2, 10.1_
  - [x] 8.7 Build simulator screen + `useSimulator` hook — [app/exam/[examId]/simulator.tsx](app/exam/[examId]/simulator.tsx), [useSimulator.ts](src/domain/simulator/useSimulator.ts)
    - Hook phases: `loading → idle/active/restore_error → submitting → result`. Per-second countdown with auto-submit at zero (Req 5.4); `AppState` listener pauses + persists on background and unpauses on foreground (Req 5.8); auto-resume on mount via `findResumableSession`/`resumeSimulator`, falling back to a restart/discard prompt on `SimulatorRestoreError` (Req 5.9). Screen reuses `QuestionCard` with `result={null}` (no in-exam feedback), one-at-a-time nav + per-question flag, pre-submit confirmation modal showing unanswered/flagged counts (Req 5.5), and a full results report — score %, PASS/FAIL vs threshold, per-domain breakdown, incorrect questions w/ explanations (Req 5.6).
    - _Requirements: 5.1–5.9_
  - [x] 8.8 Write unit tests — [ExamSimulatorController.test.ts](src/domain/simulator/__tests__/ExamSimulatorController.test.ts), [TimerDisplay.test.tsx](src/ui/__tests__/TimerDisplay.test.tsx), [simulator.test.tsx](src/__tests__/screens/simulator.test.tsx)
    - Controller (in-memory fakes): start/timer/retention, flag/unflag, submit grading + study-session recording, pause persistence, resume rebuild, `SimulatorRestoreError` on content drift, discard. Timer: `formatRemaining` + a11y labels. Screen (mocked hook): idle start, active timer/question/flag, confirmation counts, confirm submit, results report, restore-error restart/discard.
    - _Requirements: 5.1–5.9_


[x] 9. Progress tracking and analytics
  - **Domain layer in [src/domain/analytics/](src/domain/analytics/)** (barrel: [index.ts](src/domain/analytics/index.ts), types: [types.ts](src/domain/analytics/types.ts)) — exports pure calculators + the readiness-80 trigger + types, never the `useProgress`/`useProfile` hooks. Full suite after this task: **202/202 passing** (42 suites), `tsc --noEmit` + `eslint` clean.
  - [x] 9.1 Implement `ReadinessScoreCalculator.calculate(sessions, domainWeights, now?)` — [ReadinessScoreCalculator.ts](src/domain/analytics/ReadinessScoreCalculator.ts)
    - Filters to sessions completed within the last 30 days (`READINESS_WINDOW_MS`), averages each domain's recent scores, then combines those domain averages weighted by `weightPercent`; clamps the result to [0,100] (cap at 100). Falls back to an unweighted average when no scored domain carries positive weight; 0 with no recent sessions. Epoch-ms timestamps + optional `now` (the design's `Date`-based signature is bridged to numbers for DTO alignment).
    - _Requirements: 6.4, 6.5_
  - [x] 9.2 Property test for readiness bounds + 30-day filter — [readinessScore.property.test.ts](src/domain/analytics/__tests__/readinessScore.property.test.ts)
    - **Property 15** — 300 iters with sessions spanning ~60 days + random domain weights; asserts result ∈ [0,100] and equals the score computed from only the last-30-day subset.
    - Tag: `// Feature: servicenow-cert-study-app, Property 15`
    - **Validates: Requirements 6.4, 6.5**
  - [x] 9.3 Implement `StreakTracker.compute(sessionDates, today)` — [StreakTracker.ts](src/domain/analytics/StreakTracker.ts)
    - Distinct local-timezone calendar days; current = consecutive run ending today (or yesterday, since the current day isn't "missed" until it passes); longest = longest consecutive run anywhere. Keeps the design's `Date[]`/`today: Date` signature.
    - _Requirements: 6.7_
  - [x] 9.4 Property test for streak tracking — [streak.property.test.ts](src/domain/analytics/__tests__/streak.property.test.ts)
    - **Property 17** — 300 iters over random dates within a 40-day window vs an independent reference implementation; asserts current + longest match; plus missed-day-reset and consecutive-days cases.
    - Tag: `// Feature: servicenow-cert-study-app, Property 17`
    - **Validates: Requirements 6.7**
  - [x] 9.5 `Progress_Tracker` data recording (duration) — [WatermelonStudySessionRepository.ts](src/db/repositories/WatermelonStudySessionRepository.ts), [QuizSessionManager.ts](src/domain/practice/QuizSessionManager.ts), [ExamSimulatorController.ts](src/domain/simulator/ExamSimulatorController.ts)
    - Score + date were already recorded on session completion; this closes the gap by recording **duration**. `StudySessionRepository.complete` now accepts an optional `durationSeconds` (set on the row when provided); `QuizSessionManager.endSession` and `ExamSimulatorController.submitSimulator` compute `durationSeconds = round((completedAt − startedAt) / 1000)` (quiz tracks `startedAt` on its in-memory session). Optional so existing fakes/`objectContaining` assertions stay valid.
    - _Requirements: 6.1_
  - [x] 9.6 Build `ProgressRing`, `DomainAccuracyChart`, `StudyCalendar` shared components — [ProgressRing.tsx](src/ui/ProgressRing.tsx), [DomainAccuracyChart.tsx](src/ui/DomainAccuracyChart.tsx), [StudyCalendar.tsx](src/ui/StudyCalendar.tsx)
    - `ProgressRing`: bordered circle, score band color **plus** the numeric label (Req 6.5, 10.4), `accessibilityRole="progressbar"` + `accessibilityValue`. `DomainAccuracyChart`: one bar per domain with `name`, `percent% (correct/total)` text label, and band color (no color-only indicators — Req 6.2, 10.4). `StudyCalendar`: month grid highlighting studied days with a distinct background + per-day `accessibilityLabel` (Req 6.3, 10.1). **Built from RN primitives instead of `react-native-svg`** (design suggestion) to stay dependency-free and reliably testable — noted deviation.
    - _Requirements: 6.2, 6.3, 6.5, 10.1, 10.4_
  - [x] 9.7 Build progress dashboard screen + `useProgress` hook — [app/(tabs)/progress.tsx](app/(tabs)/progress.tsx), [useProgress.ts](src/domain/analytics/useProgress.ts), [useEnrolledExams.ts](src/domain/catalog/useEnrolledExams.ts)
    - No global "active exam" exists yet, so the tab renders an enrolled-exam picker (`useEnrolledExams`) and shows the dashboard for the selected one. `useProgress` assembles per-domain accuracy (new `attempts.accuracyByDomain` repo method), study-activity days, and a weighted readiness score over the last 30 days. **Readiness wiring:** since `study_sessions` stores an overall score without a domain breakdown, readiness is fed one synthetic per-domain `StudySessionScore` derived from last-30-day per-domain accuracy — keeps the pure calculator faithful while using real data. Readiness-80 banner uses `shouldSendReadiness80` against the last-sent timestamp (full crossing detection is task 12); dismissing records a `readiness_80` notification so it stays dismissed. Empty-state message when no quiz/simulator session data exists (Req 6.9).
    - _Requirements: 6.2–6.6, 6.9_
  - [x] 9.8 Build profile screen + `useProfile` hook — [app/(tabs)/profile.tsx](app/(tabs)/profile.tsx), [useProfile.ts](src/domain/analytics/useProfile.ts)
    - Aggregates across all enrolled exams from `study_sessions` (no reliance on separately-maintained counters): current/longest streak via `StreakTracker`, total questions answered (sum of `totalQuestions`), total completed study sessions. Four accessible stat cards (Req 6.8).
    - _Requirements: 6.8_
  - [x] 9.9 Write unit tests — [ReadinessScoreCalculator.test.ts](src/domain/analytics/__tests__/ReadinessScoreCalculator.test.ts), [StreakTracker.test.ts](src/domain/analytics/__tests__/StreakTracker.test.ts), [readiness80.property.test.ts](src/domain/analytics/__tests__/readiness80.property.test.ts), [ProgressRing.test.tsx](src/ui/__tests__/ProgressRing.test.tsx), [DomainAccuracyChart.test.tsx](src/ui/__tests__/DomainAccuracyChart.test.tsx), [StudyCalendar.test.tsx](src/ui/__tests__/StudyCalendar.test.tsx), [progress.test.tsx](src/__tests__/screens/progress.test.tsx), [profile.test.tsx](src/__tests__/screens/profile.test.tsx)
    - Calculator weighting/averaging/cap/empty; streak same-day/yesterday-grace/reset/longest-vs-current; **Property 16** (`shouldSendReadiness80`, 300 iters) for the readiness-80 trigger (first reach, re-send only after a sub-80 dip, never below 80); component label/clamp/marking; screen empty-state, readiness-80 banner, score render, profile totals.
    - _Requirements: 6.1–6.9_

  > **Bonus (Property 16):** the readiness-80 trigger `shouldSendReadiness80` lives in [readinessNotifications.ts](src/domain/analytics/readinessNotifications.ts) with its property test, satisfying 9.7's notification trigger + 9.9's coverage even though it isn't a standalone numbered subtask. The full `NotificationScheduler` arrives in task 12.


[x] 10. Bookmarks and review lists
  - **Domain layer in [src/domain/bookmarks/](src/domain/bookmarks/)** (barrel: [index.ts](src/domain/bookmarks/index.ts), types: [types.ts](src/domain/bookmarks/types.ts) — `BookmarkRecord` aliases the data-layer `BookmarkDTO`; `BookmarkableItem` = `{ id, itemType, examId }`). The barrel exports only the pure `BookmarkService` + types; the hooks live alongside but aren't re-exported. Full suite after this task: **221/221 passing** (48 suites), `tsc --noEmit` + `eslint` clean.
  - [x] 10.1 Implement `BookmarkService` — [BookmarkService.ts](src/domain/bookmarks/BookmarkService.ts)
    - `toggleBookmark(item, list, now?, makeId?)` adds when absent / removes when present (matched by `itemType+itemId+examId`); pure, non-mutating. `getBookmarksForExam`, `sortByDateDescending` (stable, descending `createdAt`), `groupByExam` (insertion order preserved → a pre-sorted list yields sorted groups). Optional `now`/`makeId` keep adds deterministic (the persisted id/timestamp come from the repository on save).
    - _Requirements: 7.1–7.4_
  - [x] 10.2 Property test for toggle involution — [bookmarkToggle.property.test.ts](src/domain/bookmarks/__tests__/bookmarkToggle.property.test.ts)
    - **Property 18** — 300 iters with a random item + boolean initial state + other bookmarks; asserts a single toggle flips membership and a double toggle restores the original bookmarked-item set (compared by identity key, since a re-added row gets a fresh id/timestamp).
    - Tag: `// Feature: servicenow-cert-study-app, Property 18`
    - **Validates: Requirements 7.1, 7.2**
  - [x] 10.3 Property test for grouping + sort order — [bookmarkGrouping.property.test.ts](src/domain/bookmarks/__tests__/bookmarkGrouping.property.test.ts)
    - **Property 19** — 300 iters; sorts then groups, asserting every group member belongs to its exam, each group is descending by `createdAt`, and no bookmark is lost.
    - Tag: `// Feature: servicenow-cert-study-app, Property 19`
    - **Validates: Requirements 7.3**
  - [x] 10.4 Property test for exam filter — [bookmarkExamFilter.property.test.ts](src/domain/bookmarks/__tests__/bookmarkExamFilter.property.test.ts)
    - **Property 20** — 300 iters over bookmarks with multiple exam ids; asserts `getBookmarksForExam` returns exactly (and only) the selected exam's bookmarks.
    - Tag: `// Feature: servicenow-cert-study-app, Property 20`
    - **Validates: Requirements 7.4**
  - [x] 10.5 Build `BookmarkButton` shared component — [BookmarkButton.tsx](src/ui/BookmarkButton.tsx)
    - Filled (★) / outline (☆) star with a Reanimated scale transition (`BOOKMARK_ANIM_MS = 200`, well within the 500 ms budget — Req 7.1, 7.2); `accessibilityLabel` reflects state ("Bookmark this …" / "Remove bookmark for this …") + `accessibilityState.selected` (Req 10.1); honors `disabled`.
    - _Requirements: 7.1, 7.2, 10.1_
  - [x] 10.6 Build bookmarks screen + hooks — [app/bookmarks.tsx](app/bookmarks.tsx), [useBookmarks.ts](src/domain/bookmarks/useBookmarks.ts), [useBookmarkToggle.ts](src/domain/bookmarks/useBookmarkToggle.ts)
    - `useBookmarks` loads all of the user's bookmarks, sorts + groups by exam (with exam names + per-type counts), removes (optimistic + persist), and triggers `syncWithApi` on mount + after changes. The screen renders grouped, most-recent-first cards (Req 7.3) with per-exam **Start quiz** / **Review flashcards** buttons that are disabled (and prevent navigation) when that exam has no items of that type (Req 7.5), an overall empty-state, and a `BookmarkButton` per row to remove. **Cross-device sync (Req 7.6)** reuses the existing [src/db/sync.ts](src/db/sync.ts) `syncWithApi` (`/sync/push_changes` + `/sync/pull_changes`); a best-effort sync is fired right after each bookmark mutation so changes propagate well within 30 s.
    - **Creation path wired:** `useBookmarkToggle(examId)` (optimistic per-item toggle + sync) is mounted in the quiz screen (star beside the question progress) and the flashcards session bar, so questions/flashcards can actually be bookmarked (Req 7.1, 7.2). Existing quiz/flashcards screen tests mock the hook.
    - **Flashcard bookmark sessions (Req 7.4):** `useFlashcards` gained a `mode: 'standard' | 'bookmark'` param; in bookmark mode it loads only the exam's bookmarked flashcards (via `bookmarks.listForUserAndExam` + `flashcards.getById`) and the screen hides the deck picker / add-card. Quiz bookmark sessions already worked via `QuizSessionManager.startBookmarkSession` + `?mode=bookmark`.
    - _Requirements: 7.1–7.6_
  - [x] 10.7 Write unit tests — [BookmarkService.test.ts](src/domain/bookmarks/__tests__/BookmarkService.test.ts), [BookmarkButton.test.tsx](src/ui/__tests__/BookmarkButton.test.tsx), [bookmarks.test.tsx](src/__tests__/screens/bookmarks.test.tsx)
    - Service add/remove/type-mismatch/filter/sort-no-mutate/group-order; button state labels + press + disabled; screen grouping/counts, quiz + flashcard session launch, disabled+blocked start when a type is empty (Req 7.5), row removal, empty-state.
    - _Requirements: 7.1–7.6_


[x] 11. Checkpoint — Study features complete
  - Ensure all tests pass, ask the user if questions arise.
  - **All gates green:** `pnpm test` 221/221 (48 suites), `pnpm typecheck` clean, `pnpm lint` clean. (The single `act()` console line in `login.test.tsx` is a pre-existing cosmetic warning, not a failure.)
  - **Flagged-decisions review delivered to the user** to decide whether a follow-up task (proposed "Task 16") is warranted to close the noted deviations/limitations.

- [x] 12. Notifications and study reminders
  - [x] 12.1 Implement `NotificationScheduler` pure logic functions: `computeReminderFireTime`, `rescheduleForQuietHours`, `shouldSendStreakRisk`, `shouldSendCongratulatory`, `shouldSendReadiness80`
    - All five live in [src/domain/notifications/NotificationScheduler.ts](src/domain/notifications/NotificationScheduler.ts) as a frozen object of pure functions. `shouldSendReadiness80` is re-exported from the analytics domain ([src/domain/analytics/readinessNotifications.ts](src/domain/analytics/readinessNotifications.ts)) so there is a single source of truth (it was first implemented in task 9).
    - `computeReminderFireTime(HH:MM, today)` returns the next occurrence at/after `today`, rolling to tomorrow when the time has passed. `rescheduleForQuietHours` handles both same-day and midnight-wrapping windows and moves an in-window time to the first minute after the window ends.
    - `shouldSendStreakRisk` design decision: fires only when it is at/after the cutoff hour (default 8 PM, Req 8.2), no session happened today, **and** the user studied yesterday — i.e. there is an active streak worth saving. A streak-risk alert with no streak to lose would be noise.
    - `shouldSendCongratulatory` baseline = score at the last congratulatory notification (or the earliest/enrollment score if none); fires on a ≥10-point gain with a 24-hour cooldown. Epoch-ms timestamps to match the analytics layer.
    - _Requirements: 8.1–8.4, 6.6_
  - [x] 12.2 Write property test for quiet-hours rescheduling
    - **Property 21** — [src/domain/notifications/__tests__/quietHours.property.test.ts](src/domain/notifications/__tests__/quietHours.property.test.ts). Generates windows of 1–720 minutes (≤12h) plus an in-window time and asserts the result lands exactly on quiet-end, is never inside the window, and is never earlier; a second property asserts out-of-window times are returned unchanged. 300 runs each.
    - Tag: `// Feature: servicenow-cert-study-app, Property 21`
    - **Validates: Requirements 8.4**
  - [x] 12.3 Write property test for congratulatory notification trigger
    - **Property 22** — [src/domain/notifications/__tests__/congratulatory.property.test.ts](src/domain/notifications/__tests__/congratulatory.property.test.ts). Replays score/timestamp histories live vs. an independent baseline+cooldown tracker, asserts equality of fire indices, and additionally asserts every consecutive pair of fires is ≥24h apart. 300 runs.
    - Tag: `// Feature: servicenow-cert-study-app, Property 22`
    - **Validates: Requirements 8.3**
  - [x] 12.4 Write property test for readiness-80 notification transitions
    - **Property 16** — already implemented in task 9 at [src/domain/analytics/__tests__/readiness80.property.test.ts](src/domain/analytics/__tests__/readiness80.property.test.ts) (300 runs). The function it validates is the same one re-exported by `NotificationScheduler`, so this subtask reuses it rather than duplicating the test.
    - Tag: `// Feature: servicenow-cert-study-app, Property 16`
    - **Validates: Requirements 6.6**
  - [x] 12.5 Integrate `expo-notifications` for scheduling, permission handling, and deep-link routing
    - Side-effecting wrapper in [src/notifications/notificationService.ts](src/notifications/notificationService.ts): `configureNotificationHandler`, `getPermissionState`/`ensureNotificationPermissions` (pure `derivePermissionState` maps the Expo response → `granted`/`denied`/`undetermined`; "blocked + cannot ask again" surfaces as `denied` per Req 8.5), `buildReminderFireDate` (pure: scheduler + quiet-hours), `rescheduleDailyReminder` (DATE trigger), and `addNotificationResponseRouter`.
    - Deep-link routing is a pure exhaustive map `notificationRoute(type)` in [src/domain/notifications/types.ts](src/domain/notifications/types.ts): daily reminder & streak-risk → `/(tabs)` (home/active study list), congratulatory & readiness-80 → `/(tabs)/progress`. Wired into [app/_layout.tsx](app/_layout.tsx) via a lazy `import()` (guarded out of jest so the native module never loads in tests); permissions are requested on first authenticated launch.
    - _Requirements: 8.1–8.6_
  - [x] 12.6 Build notification settings UI in profile screen
    - `useNotificationSettings` hook ([src/domain/notifications/useNotificationSettings.ts](src/domain/notifications/useNotificationSettings.ts)) loads/persists `NotificationSettingsDTO` via the repo, optimistically updates, reschedules the daily reminder on every change, and reads (without prompting) the OS permission so the UI can show a blocked-state prompt.
    - Profile screen ([app/(tabs)/profile.tsx](app/(tabs)/profile.tsx)) gains a Notifications section: per-type toggles (daily reminder, streak-risk, congratulatory, exam-ready), reminder-time and quiet-hours `HH:MM` fields, and a tappable in-app prompt when permission is `denied`. All controls carry `accessibilityRole`/`accessibilityLabel`/`accessibilityState`.
    - _Requirements: 8.4_
  - [x] 12.7 Write unit tests for NotificationScheduler and notification settings UI
    - [src/domain/notifications/__tests__/NotificationScheduler.test.ts](src/domain/notifications/__tests__/NotificationScheduler.test.ts): reminder roll-over, quiet-hours (non-wrap/evening/morning/outside), streak-risk at 8 PM (and the no-streak/already-studied/before-cutoff negatives), congratulatory cooldown, and deep-link routing for all four types.
    - [src/notifications/__tests__/notificationService.test.ts](src/notifications/__tests__/notificationService.test.ts) (expo-notifications mocked): permission mapping, quiet-hours fire date, prompt-vs-no-prompt paths, schedule/cancel, and a congratulatory tap routed to the progress dashboard.
    - Profile UI tests in [src/__tests__/screens/profile.test.tsx](src/__tests__/screens/profile.test.tsx): toggle persists via `update`, and the permission-denied prompt invokes `requestPermission`.
    - **All gates green:** `pnpm test` 254/254 (52 suites), `pnpm typecheck` clean, `pnpm lint` clean. (Pre-existing cosmetic `act()` console line in `login.test.tsx` remains.)
    - _Requirements: 8.1–8.6_


- [x] 13. Offline access and sync
  - [x] 13.1 Implement `ContentStalenessChecker.isStale(downloadedAt: Date, today: Date): boolean` pure function
    - [src/domain/offline/ContentStalenessChecker.ts](src/domain/offline/ContentStalenessChecker.ts). Returns true iff elapsed time is strictly `> 30 days` (`CONTENT_STALE_AFTER_MS`); exactly 30 days is **not** stale.
    - _Requirements: 9.8_
  - [x] 13.2 Write property test for stale content detection
    - **Property 24** — [src/domain/offline/__tests__/staleContent.property.test.ts](src/domain/offline/__tests__/staleContent.property.test.ts). Generates a download epoch + a ±60-day delta and asserts `isStale === (delta > 30 days)` over 300 runs (covers fresh, exactly-30-day, and future-dated cases).
    - Tag: `// Feature: servicenow-cert-study-app, Property 24`
    - **Validates: Requirements 9.8**
  - [x] 13.3 Implement `OfflineSyncQueue`: `enqueue`, `flush`, `getPendingCount`, `retryOnReconnect`
    - [src/domain/offline/OfflineSyncQueue.ts](src/domain/offline/OfflineSyncQueue.ts). `enqueue` dedupes by `id`; `flush` attempts every pending update via an injected `deliver` fn, removing successes and retaining failures; concurrent flushes are coalesced; `retryOnReconnect` is a fire-and-forget flush.
    - **Design note:** durable cross-restart persistence of local writes is already provided by WatermelonDB; this queue is the in-memory retry/timing coordinator on top of it. The live "stable ≥5s → sync within 60s" reconnect behavior (Req 9.5/9.6) is implemented by `startSyncWatcher` in [src/db/sync.ts](src/db/sync.ts), now wired into the root layout (13.7).
    - _Requirements: 9.4–9.6_
  - [x] 13.4 Write property test for offline queue retry behavior
    - **Property 23** — [src/domain/offline/__tests__/offlineQueue.property.test.ts](src/domain/offline/__tests__/offlineQueue.property.test.ts). Enqueues a unique set of updates, fails the first N delivery attempts (simulated interruption), flushes repeatedly, and asserts the queue drains to 0, every update is delivered, and none is delivered twice. 200 runs.
    - Tag: `// Feature: servicenow-cert-study-app, Property 23`
    - **Validates: Requirements 9.4, 9.5, 9.6**
  - [x] 13.5 Implement exam content download using Expo FileSystem
    - [src/offline/examContentDownload.ts](src/offline/examContentDownload.ts): pure `evaluateStorage` (sufficient iff `available ≥ required`) and `utf8ByteLength`, plus a `downloadExamContent(examId, deps)` orchestrator that assembles all questions/answers/decks/flashcards (Req 9.1), estimates bytes, checks `getFreeDiskStorageAsync` first, and throws `InsufficientStorageError` **without writing** on shortfall (Req 9.2). A manifest records `downloadedAt` for staleness. The repository load is dynamically imported so the module is unit-testable without the native SQLite adapter.
    - **Resolved (Task 16.9/16.10):** now has real callers — the catalog exam-detail "Download for offline" action (`useCatalog.downloadExam`) and the content-update refresh seam (4.6/16.10) both call `downloadExamContent`.
    - _Requirements: 9.1, 9.2_
  - [x] 13.6 Build `OfflineBanner` and `ContentStaleWarning` shared components
    - [src/ui/OfflineBanner.tsx](src/ui/OfflineBanner.tsx) and [src/ui/ContentStaleWarning.tsx](src/ui/ContentStaleWarning.tsx). Both are presentational (`visible` prop), pair an icon with text (no color-only meaning), and set `accessibilityRole`, `accessibilityLabel`, and `accessibilityLiveRegion="polite"` (Req 10.1). `ContentStaleWarning` renders a tappable refresh prompt when `onRefresh` is provided.
    - _Requirements: 9.7, 9.8, 10.1_
  - [x] 13.7 Wire offline detection and sync into the root layout
    - [app/_layout.tsx](app/_layout.tsx): `useOfflineStatus` (NetInfo, treats "connected but unreachable" as offline) drives `OfflineBanner`; `useStaleDownloads` checks enrolled exams' manifests via `ContentStalenessChecker` and drives `ContentStaleWarning`. A guarded effect starts `startSyncWatcher` on authenticated launch so reconnect sync (and thus queued-update retry, Req 9.5/9.6) runs. The connectivity/sync imports are lazy and `NODE_ENV==='test'`-guarded so native modules never load under jest.
    - _Requirements: 9.3–9.8_
  - [x] 13.8 Write unit tests for ContentStalenessChecker, OfflineSyncQueue, and offline UI components
    - [ContentStalenessChecker.test.ts](src/domain/offline/__tests__/ContentStalenessChecker.test.ts) (boundary cases), [OfflineSyncQueue.test.ts](src/domain/offline/__tests__/OfflineSyncQueue.test.ts) (dedupe, partial-failure counts, retry drain, `retryOnReconnect`), [examContentDownload.test.ts](src/offline/__tests__/examContentDownload.test.ts) (storage evaluation, UTF-8 sizing, sufficient write + insufficient halt), and component tests [OfflineBanner.test.tsx](src/ui/__tests__/OfflineBanner.test.tsx) / [ContentStaleWarning.test.tsx](src/ui/__tests__/ContentStaleWarning.test.tsx) (visibility + accessibility + refresh tap).
    - **All gates green:** `pnpm test` 276/276 (59 suites), `pnpm typecheck` clean, `pnpm lint` clean. (Pre-existing cosmetic `act()` console line in `login.test.tsx` remains.)
    - _Requirements: 9.1–9.8_


- [x] 14. Accessibility implementation
  - [x] 14.1 Implement `HighContrastThemeProvider` and `highContrastTheme` color map
    - Semantic theme tokens + two palettes in [src/ui/theme/themes.ts](src/ui/theme/themes.ts) (`standardTheme` slate; `highContrastTheme` on pure black). [src/ui/theme/ThemeProvider.tsx](src/ui/theme/ThemeProvider.tsx) exposes `ThemeProvider`/`useTheme`; activation is a synchronous React state update (applied on the next render, well within the 500 ms budget — Req 10.5). Provider wired at the root in [app/_layout.tsx](app/_layout.tsx); `useTheme` has a safe standard-theme default so components render without a provider. A user-facing toggle was added to the profile **Accessibility** section.
    - **Naming note:** the design calls this `HighContrastThemeProvider`; it is implemented as a general `ThemeProvider` that swaps the high-contrast palette, which is the same capability under a more conventional name.
    - **Scope note (flagged → RESOLVED in Task 16 Part B, subtasks 16.6–16.8):** the theme infrastructure, contrast guarantees, provider, and toggle were complete here; the deferred screen-color migration is now done — every `app/**` screen and `src/ui/**` component consumes theme tokens via `useThemedStyles`, the token set was expanded to faithfully cover the mixed palette, and the preference is persisted/rehydrated. High-contrast now repaints the whole app.
    - _Requirements: 10.3, 10.5_
  - [x] 14.2 Write property test for high-contrast color contrast ratios
    - **Property 26** — [src/ui/theme/__tests__/highContrast.property.test.ts](src/ui/theme/__tests__/highContrast.property.test.ts). Enumerates `themeContrastPairs(highContrastTheme)` and asserts each clears 4.5:1 via the pure WCAG `contrastRatio` ([src/ui/theme/contrast.ts](src/ui/theme/contrast.ts)); also a `test.each` per pair. Contrast math unit-tested in [contrast.test.ts](src/ui/theme/__tests__/contrast.test.ts).
    - Tag: `// Feature: servicenow-cert-study-app, Property 26`
    - **Validates: Requirements 10.3**
  - [x] 14.3 Implement `ScaledText` component
    - [src/ui/ScaledText.tsx](src/ui/ScaledText.tsx): applies the OS font scale clamped to 100%–200% (`clampFontScale`/`scaledFontSize`) and sets `allowFontScaling={false}` so text never scales past the 200% cap (preventing truncation/overlap); text wraps freely (no default `numberOfLines`). The scale is injectable for deterministic tests.
    - _Requirements: 10.2_
  - [x] 14.4 Audit all interactive elements across all screens for accessibility compliance
    - Audited every `Pressable`/`TouchableOpacity`/`TextInput`/`Switch` across `app/**` and `src/ui/**`. **Result: already compliant** — every interactive element carries a non-empty `accessibilityLabel` and an appropriate `accessibilityRole` (added during tasks 4–13). Dynamic regions (`QuestionCard` feedback, banners, progress updates) use `accessibilityLiveRegion`. Color-coded indicators pair color with text + icon (e.g. `QuestionCard` "✓ Correct" / "✗ Incorrect", offline/stale banners). No code changes were required beyond the new components.
    - _Requirements: 10.1, 10.4_
  - [x] 14.5 Write property test for accessibility labels on interactive elements
    - **Property 25** — [src/ui/__tests__/accessibilityLabels.property.test.tsx](src/ui/__tests__/accessibilityLabels.property.test.tsx). Renders each shared component (BookmarkButton, ContentStaleWarning, OfflineBanner, EnrollmentLimitWarning, QuestionCard), finds every node with an interactive `accessibilityRole`, and asserts a non-empty `accessibilityLabel`.
    - Tag: `// Feature: servicenow-cert-study-app, Property 25`
    - **Validates: Requirements 10.1**
  - [x] 14.6 Write unit tests for accessibility compliance
    - High-contrast activation timing (synchronous theme swap) in [ThemeProvider.test.tsx](src/ui/theme/__tests__/ThemeProvider.test.tsx); `ScaledText` at 100/150/200% (and >200% cap) in [ScaledText.test.tsx](src/ui/__tests__/ScaledText.test.tsx); color-coded indicators carry text + icon in [colorIndicators.test.tsx](src/ui/__tests__/colorIndicators.test.tsx).
    - **All gates green:** `pnpm test` 307/307 (65 suites), `pnpm typecheck` clean, `pnpm lint` clean. (Pre-existing cosmetic `act()` console line in `login.test.tsx` remains.)
    - _Requirements: 10.1–10.5_


- [x] 15. Home screen and final integration
  - [x] 15.1 Build home screen (`app/(tabs)/index.tsx`)
    - Active study list: one card per enrolled exam (`useHomeDashboard`) with a readiness `ProgressRing`, current streak, and quick-action buttons routing to quiz / flashcards / simulator (`/exam/{id}/{segment}`). Empty state links to the catalog; loading + error states handled. — [app/(tabs)/index.tsx](app/(tabs)/index.tsx)
    - New aggregate hook [src/domain/analytics/useHomeDashboard.ts](src/domain/analytics/useHomeDashboard.ts) computes per-exam readiness (reusing `ReadinessScoreCalculator` over 30-day per-domain accuracy, matching `useProgress`) and per-exam streak (`StreakTracker`) in one pass, so the list can't call per-exam hooks in a loop.
    - Screen test: [src/__tests__/screens/home.test.tsx](src/__tests__/screens/home.test.tsx).
    - _Requirements: 2.3, 6.4, 6.7_
  - [x] 15.2 Wire root layout auth guard (`app/_layout.tsx`)
    - Inner `RootStack` runs inside `ClerkProvider`, reads `useAuth()`, and uses `useSegments` + `router.replace` to bounce unauthenticated users out of protected groups and authenticated users out of `(auth)`. Shows an `ActivityIndicator` splash until Clerk hydrates. — [app/_layout.tsx](app/_layout.tsx)
    - `app/index.tsx` does the initial redirect based on `useAuth().isSignedIn` so users don't see a flash of `(tabs)` before being kicked back. — [app/index.tsx](app/index.tsx)
    - 30-day session lifetime is enforced by Clerk dashboard config, not code.
    - _Requirements: 1.6, 1.14_
  - [x] 15.3 State wiring — per-feature hooks over a global store (documented architecture decision)
    - **Decision:** the app wires state through cohesive per-feature hooks (`useEnrolledExams`, `useQuiz`, `useFlashcards`, `useSimulator`, `useProgress`, `useHomeDashboard`, `useBookmarks`, `useNotificationSettings`, `useOfflineStatus`, `useStaleDownloads`) backed directly by the WatermelonDB repositories, with auth from Clerk's `useAuth` and theming/offline via React context (`ThemeProvider`, `OfflineBanner`). WatermelonDB is already the observable source of truth, so a separate Zustand store would duplicate cache state with no functional gain; `zustand` stays a dependency but is intentionally unused. All nine state areas (auth, enrollment, quiz, flashcard, simulator, progress, bookmarks, notifications, offline) flow through this layer and are exercised by the screen + integration tests.
    - _Requirements: all_
  - [x] 15.4 Integration tests for critical end-to-end flows
    - Exam simulator pause/resume state persistence — full start→answer→pause→(new controller/restart)→resume→submit lifecycle, asserting the graded score records a completed study session. [src/__tests__/integration/simulatorLifecycle.integration.test.ts](src/__tests__/integration/simulatorLifecycle.integration.test.ts) (Req 5.6, 5.8)
    - Offline download and content availability check — download a bundle through the FileSystem layer, read the manifest back, and confirm freshness via `ContentStalenessChecker`. [src/__tests__/integration/offlineDownload.integration.test.ts](src/__tests__/integration/offlineDownload.integration.test.ts) (Req 9.1, 9.8)
    - Sync begins within 60s of stable reconnect — drives `startSyncWatcher` with mocked NetInfo + fake timers, asserting the WatermelonDB sync protocol (`/sync/pull_changes`) fires only after a stable ≥5s reconnect. [src/__tests__/integration/syncReconnect.integration.test.ts](src/__tests__/integration/syncReconnect.integration.test.ts) (Req 9.5, 9.6)
    - **Partly resolved (Task 16 Part A):** `/sync/*` is now real (per-table protocol + Neon store) and the round-trip / user-scoping / tombstone / content-rejection logic is covered by the 16.5 protocol tests against a faithful in-memory store. The **live** WatermelonDB↔Worker↔Neon round-trip and 30-second cross-device bookmark sync still require a running Hono Worker against a Neon branch, so they remain a deploy-time check rather than a Jest test. (Req 7.6, 9.4)
    - _Requirements: 5.8, 7.6, 9.1–9.6_

- [x] 16. Deferred follow-ups — worker sync (A1) + high-contrast theme-token migration
  - **Part A — Worker-side sync (closes flagged decision A1).** **Goal:** Replace the stubbed `POST /sync/pull_changes` and `POST /sync/push_changes` routes with real per-table WatermelonDB sync logic against Neon Postgres, so cross-device bookmark sync (Req 7.6) and offline→online progress sync (Req 9.4–9.6) actually function end-to-end. Today both routes authenticate, return `{ changes: {}, timestamp }` / `{ ok: true }`, and never touch Neon ([workers/src/routes/sync.ts](workers/src/routes/sync.ts)); the per-table SQL was explicitly deferred from task 2.4. This task is a prerequisite for the real sync round-trip integration test in task 15.4.
  - **Protocol:** Follow the WatermelonDB sync backend contract (https://watermelondb.dev/docs/Sync/Backend). `user_id`-scoped tables are push **and** pull (`user_question_attempts`, `study_sessions`, `simulator_sessions`, `bookmarks`, `notification_settings`, `readiness_score_notifications`, and the `users` row); server-authored content tables (`exams`, `topic_domains`, `blueprint_skills`, `questions`, `answer_choices`, `decks`, `flashcards`, `content_update_notifications`) are **pull-only** and must reject client pushes.
  - [x] 16.1 Finalize the Postgres mirror schema in [workers/sql/schema.sql](workers/sql/schema.sql)
    - Every synced table now carries `id TEXT PRIMARY KEY` plus dedicated sync bookkeeping that never collides with domain columns (e.g. `questions.updated_at`): `sync_created_at BIGINT NOT NULL` (insert time → buckets created vs updated), `sync_updated_at BIGINT NOT NULL` (delta cursor; a delete bumps it too), and `sync_deleted_at BIGINT NULL` (tombstone). `notification_settings` was fixed to an `id` PK + unique `user_id` (WatermelonDB always sends an `id`). Added `(user_id, sync_updated_at)` indexes on user tables and `(sync_updated_at)` on content tables.
    - _Requirements: 7.6, 9.4_
  - [x] 16.2 Implement `pull_changes`
    - Pure orchestration ([workers/src/sync/protocol.ts](workers/src/sync/protocol.ts)) iterates all tables and returns the WatermelonDB `{ <table>: { created, updated, deleted } }` shape + server `timestamp`. The Neon-backed store ([workers/src/db/syncStore.ts](workers/src/db/syncStore.ts)) selects `WHERE sync_updated_at > $lastPulledAt` (user/self tables also scope by `user_id`/`id`), then buckets each row: tombstone → `deleted`, `sync_created_at > lastPulledAt` → `created`, else `updated`. Timestamp (`*_at`) columns are cast to double precision so the Neon HTTP driver returns JS numbers.
    - _Requirements: 7.6, 9.4–9.6_
  - [x] 16.3 Implement `push_changes`
    - `NeonSyncStore.pushTable` upserts `created`+`updated` via `INSERT … ON CONFLICT (id) DO UPDATE SET … WHERE <table>.<scope> = $userId`, forcing the scoping column to the authenticated user so a client can't plant a row under another id; `deleted` ids become tombstone updates scoped to `$userId`. All statements for a table run in one `sql.transaction([...])` batch so a partial push never half-applies. Column/table identifiers come only from the trusted `TABLE_DATA_COLUMNS` allow-list; values bind as `$n` params.
    - _Requirements: 7.6, 9.4–9.6_
  - [x] 16.4 Enforce auth scoping + content-table write rejection
    - Every read/write is scoped to the Clerk-JWT `userId` (user tables by `user_id`, the `users` row by `id`). `pushChanges` only applies self/user tables in FK-safe `PUSH_ORDER`; any content or unknown table that arrives with writes is ignored and reported in `rejectedTables` (the route logs it). Content tables are pull-only.
    - _Requirements: 7.6_
  - [x] 16.5 Write worker sync tests
    - [workers/src/sync/__tests__/syncProtocol.test.ts](workers/src/sync/__tests__/syncProtocol.test.ts) (9 tests, run by the root Jest) drive the protocol against an in-memory `FakeStore` that mirrors NeonSyncStore's scoping/bucketing/tombstone semantics: bookmark round-trip (push→pull as `created`), delete→tombstone to a later cursor, created-vs-updated bucketing by server create time, user A cannot see/overwrite user B's rows, content + unknown table pushes rejected, content pull-only to any user, the self (`users`) row scoped by `id`, and empty-push no-op. The worker test file is excluded from the worker `tsc` gate (no Jest types there). **Still deferred:** the live Worker→Neon-branch round-trip (the 15.4 piece) needs a running Worker + Neon branch and so remains a deploy-time check, not a Jest test.
    - _Requirements: 7.6, 9.4–9.6_
  - **Part B — High-contrast theme-token migration (closes the task 14.1 scope note).** **Goal:** Make the high-contrast theme actually repaint every screen. Task 14 delivered the theme system (`ThemeProvider`/`useTheme`, `standardTheme`/`highContrastTheme`, WCAG-validated pairs) and a profile toggle, but existing screens still use hardcoded `StyleSheet` hex colors, so toggling high-contrast has no visible effect on them yet.
  - [x] 16.6 Migrate screen + shared-component colors to theme tokens
    - **Decision (flagged → resolved as "Option A: expand the token set"):** the app uses a mixed palette (dark screens + white data-viz cards on Progress), which the original 10 tokens couldn't express. The `Theme` interface was expanded to ~25 semantic tokens — neutrals (`background`/`surface`/`border`/`borderStrong`/`textPrimary`/`textBody`/`textSecondary`), accents (`accent`+`onAccent`, `accentStrong`+`onAccentStrong`, `accentStrongPressed`), status foregrounds (`success`/`danger`/`warning`), status surfaces+on-color (`dangerSurface`/`successSurface`/`infoSurface`/`warningSurface`), the light "card" family (`card`/`cardText`/`cardMuted`/`cardTrack`), and on-card status (`bandSuccess`/`bandWarning`/`bandDanger`, `studiedSurface`/`onStudiedSurface`) — in [themes.ts](src/ui/theme/themes.ts). The **standard** palette equals the exact pre-migration colors (white cards preserved); **highContrast** repaints neutrals/accents to black/white/yellow and keeps status surfaces dark+saturated with white text. Added a `useThemedStyles(makeStyles)` helper ([useThemedStyles.ts](src/ui/theme/useThemedStyles.ts)) that calls `StyleSheet.create` inside the factory to preserve precise style types. Migrated **all** `app/**` screens (home, catalog, progress, profile, bookmarks, quiz, flashcards, simulator, review, auth login/register/forgot, root + index splashes) and `src/ui/**` shared components (QuestionCard, FlashcardDeck, ProgressRing, DomainAccuracyChart, StudyCalendar, TimerDisplay, BookmarkButton, OfflineBanner, ContentStaleWarning, EnrollmentLimitWarning) off hardcoded hex (zero remaining besides two intentional modal-scrim rgba overlays). `ProgressRing` gained a `tone="onSurface"|"onCard"` prop since it renders on both dark home cards and the white Progress card. `themeContrastPairs` was extended with the new text pairs (all validated ≥4.5:1 by Property 26 in both palettes).
    - _Requirements: 10.3, 10.5_
  - [x] 16.7 Persist the high-contrast preference
    - Added [highContrastStorage.ts](src/ui/theme/highContrastStorage.ts) (`AsyncStorage`-backed, key `sn_cert_prep.high_contrast.v1`, resilient/never-throws — consistent with the existing `domainSelectionStorage` pattern). `ThemeProvider` now hydrates the stored value on mount and persists every change (writes suppressed until hydration completes so the default never clobbers a saved choice), so high-contrast survives restarts (Req 10.6). Also replaced the unresolvable shipped AsyncStorage jest mock in [jest.setup.ts](jest.setup.ts) with a self-contained in-memory mock.
    - _Requirements: 10.5, 10.6_
  - [x] 16.8 Add a high-contrast regression test
    - [highContrast.regression.test.tsx](src/ui/theme/__tests__/highContrast.regression.test.tsx): asserts a `useThemedStyles` component repaints to high-contrast token values on toggle (Req 10.5), that the preference is persisted to AsyncStorage when enabled, that a fresh mount rehydrates a stored `true` preference, and that a stored `false` overrides `initialHighContrast` (Req 10.6). Guards against future hardcoded-color regressions.
    - _Requirements: 10.3_
  - **Part C — Wire the offline content download (closes the task 4.6/13.5 seam).** **Goal:** Connect the already-built `downloadExamContent` orchestrator ([src/offline/examContentDownload.ts](src/offline/examContentDownload.ts)) to real callers. It is currently unreferenced outside its own tests: there is no user-facing way to download an exam for offline use (Req 9.1), and `useCatalog` still calls `processContentUpdates` with the **default no-op** `refreshContent`, so the 24-hour content auto-refresh (Req 2.7) only bumps the local version without re-downloading.
  - [x] 16.9 Add a user-triggered offline download
    - `useCatalog` gained `downloadStates` + `downloadExam(examId)`, which calls `downloadExamContent(examId, defaultDownloadDeps)`, records the manifest via `exams.markContentDownloaded`, and maps `InsufficientStorageError` to a friendly "not enough free space" message (other failures → generic retry message). The catalog exam-detail block ([app/(tabs)/catalog.tsx](app/(tabs)/catalog.tsx)) now has an "Offline access" section with a Download/Re-download button (busy spinner, ≥44pt target, `accessibilityState` busy/disabled), an error `alert`, and a "Saved for offline use" confirmation. Covered by two new catalog screen tests.
    - _Requirements: 9.1, 9.2_
  - [x] 16.10 Wire content-update refresh to the real downloader
    - `useCatalog` now passes `refreshContent: (examId) => downloadExamContent(examId, defaultDownloadDeps)` into `processContentUpdates`, so an enrolled+downloaded exam's content is actually re-fetched on a content update (Req 2.7). Updated the stale "wired in task 13.5" comments in [src/domain/catalog/contentUpdateDelivery.ts](src/domain/catalog/contentUpdateDelivery.ts) and `useCatalog`.
    - _Requirements: 2.7, 9.1_

- [x] 17. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
  - **Verified (all gates green):** app `tsc --noEmit` clean · worker `tsc --noEmit` clean · `eslint .` clean · Jest **71 suites / 341 tests** passing · property tests **26 suites / 81 tests** passing. The only test-time console output is the expected `EXPO_PUBLIC_API_BASE_URL not configured` dev warning (not a failure). All of tasks 1–16 are complete.


## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Checkpoints at tasks 7, 11, and 17 ensure incremental validation. Task 16 collects the deferred follow-ups flagged during tasks 1–15: **Part A** worker-side Neon sync (from task 2.4), **Part B** high-contrast theme-token migration (from task 14.1), and **Part C** wiring the offline content download (from tasks 4.6/13.5)
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
