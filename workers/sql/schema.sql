-- Postgres schema for SN Cert Prep (Unofficial).
--
-- Mirrors the WatermelonDB schema in `../src/db/schema.ts` so the sync
-- protocol can round-trip rows without translation.  Conventions:
--   * `id` is TEXT (matches WatermelonDB's string IDs)
--   * `_at` columns are BIGINT (Unix ms)
--   * `user_id` is TEXT (Clerk user ID, e.g. "user_2abc…")
--   * `updated_at` is required on every per-user table for sync deltas
--
-- Apply with:
--   psql "$DATABASE_URL" -f workers/sql/schema.sql
--
-- This is a starter — indexes, RLS policies, and migration tooling
-- land in a follow-up.

-- ----------------------------------------------------------------------
-- users (mirror of Clerk identity; profile counters live here)
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id                          TEXT PRIMARY KEY,           -- Clerk user ID
  email                       TEXT NOT NULL,
  display_name                TEXT NOT NULL DEFAULT '',
  created_at                  BIGINT NOT NULL,
  updated_at                  BIGINT NOT NULL,
  streak_current              INTEGER NOT NULL DEFAULT 0,
  streak_longest              INTEGER NOT NULL DEFAULT 0,
  total_questions_answered    INTEGER NOT NULL DEFAULT 0,
  total_study_sessions        INTEGER NOT NULL DEFAULT 0
);

-- ----------------------------------------------------------------------
-- Content tables — server-authored, pulled only (never pushed by client)
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS exams (
  id                          TEXT PRIMARY KEY,
  name                        TEXT NOT NULL,
  certification_level         TEXT NOT NULL,
  estimated_study_hours       INTEGER NOT NULL DEFAULT 0,
  official_duration_minutes   INTEGER NOT NULL DEFAULT 0,
  official_question_count     INTEGER NOT NULL DEFAULT 0,
  official_passing_score      INTEGER NOT NULL DEFAULT 70,
  minimum_question_count      INTEGER NOT NULL DEFAULT 200,
  content_version             TEXT NOT NULL DEFAULT '',
  updated_at                  BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS topic_domains (
  id                          TEXT PRIMARY KEY,
  exam_id                     TEXT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  name                        TEXT NOT NULL,
  weight_percent              INTEGER NOT NULL,
  updated_at                  BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS blueprint_skills (
  id                          TEXT PRIMARY KEY,
  exam_id                     TEXT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  domain_id                   TEXT NOT NULL REFERENCES topic_domains(id) ON DELETE CASCADE,
  code                        TEXT NOT NULL,
  description                 TEXT NOT NULL,
  blueprint_source_url        TEXT NOT NULL,
  blueprint_retrieved_at      BIGINT NOT NULL,
  updated_at                  BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS questions (
  id                          TEXT PRIMARY KEY,
  exam_id                     TEXT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  domain_id                   TEXT NOT NULL REFERENCES topic_domains(id) ON DELETE CASCADE,
  blueprint_skill_id          TEXT NOT NULL REFERENCES blueprint_skills(id) ON DELETE RESTRICT,
  text                        TEXT NOT NULL,
  image_url                   TEXT,
  image_alt_text              TEXT NOT NULL DEFAULT '',
  explanation                 TEXT NOT NULL,
  difficulty_level            TEXT NOT NULL CHECK (difficulty_level IN ('easy','medium','hard')),
  blooms_level                TEXT NOT NULL CHECK (blooms_level IN ('remember','understand','apply','analyze')),
  author_id                   TEXT NOT NULL,
  source_notes                TEXT NOT NULL DEFAULT '',
  review_status               TEXT NOT NULL CHECK (review_status IN ('draft','reviewed','published')),
  reviewed_by                 TEXT,
  reviewed_at                 BIGINT,
  published_at                BIGINT,
  times_answered              INTEGER NOT NULL DEFAULT 0,
  times_answered_correctly    INTEGER NOT NULL DEFAULT 0,
  is_pool_reset               BOOLEAN NOT NULL DEFAULT FALSE,
  created_at                  BIGINT NOT NULL,
  updated_at                  BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS answer_choices (
  id                          TEXT PRIMARY KEY,
  question_id                 TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  text                        TEXT NOT NULL,
  is_correct                  BOOLEAN NOT NULL,
  sort_order                  INTEGER NOT NULL,
  updated_at                  BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS decks (
  id                          TEXT PRIMARY KEY,
  exam_id                     TEXT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  domain_id                   TEXT REFERENCES topic_domains(id) ON DELETE SET NULL,
  name                        TEXT NOT NULL,
  is_custom                   BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at                  BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS flashcards (
  id                          TEXT PRIMARY KEY,
  deck_id                     TEXT NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  term                        TEXT NOT NULL,
  definition                  TEXT NOT NULL,
  is_custom                   BOOLEAN NOT NULL DEFAULT FALSE,
  ease_factor                 REAL NOT NULL DEFAULT 2.5,
  interval_days               INTEGER NOT NULL DEFAULT 1,
  repetition_count            INTEGER NOT NULL DEFAULT 0,
  next_review_at              BIGINT NOT NULL,
  last_reviewed_at            BIGINT,
  updated_at                  BIGINT NOT NULL
);

-- ----------------------------------------------------------------------
-- Per-user tables — synced both directions, scoped by user_id
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS study_sessions (
  id                          TEXT PRIMARY KEY,
  user_id                     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exam_id                     TEXT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  session_type                TEXT NOT NULL CHECK (session_type IN ('quiz','flashcard','simulator')),
  started_at                  BIGINT NOT NULL,
  completed_at                BIGINT,
  score                       INTEGER,
  total_questions             INTEGER NOT NULL DEFAULT 0,
  correct_answers             INTEGER NOT NULL DEFAULT 0,
  duration_seconds            INTEGER NOT NULL DEFAULT 0,
  updated_at                  BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_question_attempts (
  id                          TEXT PRIMARY KEY,
  user_id                     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id                 TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  session_id                  TEXT NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
  selected_answer_id          TEXT NOT NULL,
  is_correct                  BOOLEAN NOT NULL,
  attempted_at                BIGINT NOT NULL,
  updated_at                  BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS bookmarks (
  id                          TEXT PRIMARY KEY,
  user_id                     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_type                   TEXT NOT NULL CHECK (item_type IN ('question','flashcard')),
  item_id                     TEXT NOT NULL,
  exam_id                     TEXT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  created_at                  BIGINT NOT NULL,
  updated_at                  BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS simulator_sessions (
  id                          TEXT PRIMARY KEY,
  user_id                     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exam_id                     TEXT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  started_at                  BIGINT NOT NULL,
  paused_at                   BIGINT,
  submitted_at                BIGINT,
  expires_at                  BIGINT NOT NULL,
  remaining_seconds           INTEGER NOT NULL,
  state                       TEXT NOT NULL CHECK (state IN ('active','paused','submitted','discarded')),
  answers_json                TEXT NOT NULL DEFAULT '{}',
  flagged_json                TEXT NOT NULL DEFAULT '[]',
  updated_at                  BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS notification_settings (
  user_id                     TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  daily_reminder_enabled      BOOLEAN NOT NULL DEFAULT TRUE,
  daily_reminder_time         TEXT NOT NULL DEFAULT '19:00',
  streak_risk_enabled         BOOLEAN NOT NULL DEFAULT TRUE,
  congratulatory_enabled      BOOLEAN NOT NULL DEFAULT TRUE,
  readiness_80_enabled        BOOLEAN NOT NULL DEFAULT TRUE,
  quiet_hours_start           TEXT,
  quiet_hours_end             TEXT,
  updated_at                  BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS readiness_score_notifications (
  id                          TEXT PRIMARY KEY,
  user_id                     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exam_id                     TEXT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  notification_type           TEXT NOT NULL CHECK (notification_type IN ('congratulatory','readiness_80')),
  score_at_notification       INTEGER NOT NULL,
  sent_at                     BIGINT NOT NULL,
  updated_at                  BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS content_update_notifications (
  id                          TEXT PRIMARY KEY,
  exam_id                     TEXT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  content_version             TEXT NOT NULL,
  published_at                BIGINT NOT NULL,
  notified_at                 BIGINT,
  updated_at                  BIGINT NOT NULL
);

-- ----------------------------------------------------------------------
-- Indexes used by sync's incremental SELECTs
-- ----------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_users_updated_at ON users (updated_at);
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_updated ON study_sessions (user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_user_question_attempts_user_updated ON user_question_attempts (user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_updated ON bookmarks (user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_simulator_sessions_user_updated ON simulator_sessions (user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_readiness_user_updated ON readiness_score_notifications (user_id, updated_at);
