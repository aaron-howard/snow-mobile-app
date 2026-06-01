/**
 * WatermelonDB sync protocol — pure orchestration, no I/O.
 *
 * Protocol: https://watermelondb.dev/docs/Sync/Backend
 *
 * This module owns the *policy* (which tables sync, in which direction, how
 * they are scoped) and the *orchestration* (iterate tables, assemble the
 * change-set, reject content-table writes). All actual SQL lives behind the
 * {@link SyncStore} seam so this file is dependency-free and unit-testable
 * with an in-memory fake.
 */

export type TableScope = 'self' | 'user' | 'content';

/** A WatermelonDB raw record: an `id` plus arbitrary column values. */
export interface RawRecord {
  id: string;
  [column: string]: unknown;
}

/** The WatermelonDB per-table change shape. */
export interface TableChange {
  created?: RawRecord[];
  updated?: RawRecord[];
  deleted?: string[];
}

export type ChangeSet = Record<string, TableChange>;

/** Rows pulled for a single table, already bucketed by the store. */
export interface PulledRows {
  created: RawRecord[];
  updated: RawRecord[];
  deleted: string[];
}

/**
 * Storage seam. Implementations translate these calls into SQL (Neon) or
 * in-memory operations (tests). The store is responsible for:
 *   - scoping every read/write to `userId` for `self`/`user` tables,
 *   - bucketing pulled rows into created/updated/deleted,
 *   - stamping sync bookkeeping (sync_created_at/sync_updated_at/sync_deleted_at),
 *   - never letting one user read or mutate another user's rows.
 */
export interface SyncStore {
  pullTable(
    table: string,
    scope: TableScope,
    userId: string,
    lastPulledAt: number,
  ): Promise<PulledRows>;
  pushTable(table: string, userId: string, change: TableChange, now: number): Promise<void>;
}

/** Sync direction + scoping policy for every WatermelonDB table. */
export const TABLE_SCOPES: Readonly<Record<string, TableScope>> = {
  users: 'self',
  // Content (server-authored) — pull only.
  exams: 'content',
  topic_domains: 'content',
  blueprint_skills: 'content',
  questions: 'content',
  answer_choices: 'content',
  decks: 'content',
  flashcards: 'content',
  content_update_notifications: 'content',
  // Per-user — push and pull, scoped by user_id.
  study_sessions: 'user',
  user_question_attempts: 'user',
  bookmarks: 'user',
  simulator_sessions: 'user',
  notification_settings: 'user',
  readiness_score_notifications: 'user',
};

/**
 * Non-`id` data columns per table (WatermelonDB column names). Used by the
 * Neon store to build projections / upserts and to reject unknown columns;
 * device-local-only exam fields (is_enrolled, enrolled_at,
 * content_downloaded_at) are intentionally excluded — they never sync.
 */
export const TABLE_DATA_COLUMNS: Readonly<Record<string, readonly string[]>> = {
  users: [
    'email',
    'display_name',
    'created_at',
    'streak_current',
    'streak_longest',
    'total_questions_answered',
    'total_study_sessions',
  ],
  exams: [
    'name',
    'certification_level',
    'estimated_study_hours',
    'official_duration_minutes',
    'official_question_count',
    'official_passing_score',
    'minimum_question_count',
    'content_version',
  ],
  topic_domains: ['exam_id', 'name', 'weight_percent'],
  blueprint_skills: [
    'exam_id',
    'domain_id',
    'code',
    'description',
    'blueprint_source_url',
    'blueprint_retrieved_at',
  ],
  questions: [
    'exam_id',
    'domain_id',
    'blueprint_skill_id',
    'text',
    'image_url',
    'image_alt_text',
    'explanation',
    'difficulty_level',
    'blooms_level',
    'author_id',
    'source_notes',
    'review_status',
    'reviewed_by',
    'reviewed_at',
    'published_at',
    'times_answered',
    'times_answered_correctly',
    'is_pool_reset',
    'created_at',
    'updated_at',
  ],
  answer_choices: ['question_id', 'text', 'is_correct', 'sort_order'],
  decks: ['exam_id', 'domain_id', 'name', 'is_custom'],
  flashcards: [
    'deck_id',
    'term',
    'definition',
    'is_custom',
    'ease_factor',
    'interval_days',
    'repetition_count',
    'next_review_at',
    'last_reviewed_at',
  ],
  study_sessions: [
    'user_id',
    'exam_id',
    'session_type',
    'started_at',
    'completed_at',
    'score',
    'total_questions',
    'correct_answers',
    'duration_seconds',
  ],
  user_question_attempts: [
    'user_id',
    'question_id',
    'session_id',
    'selected_answer_id',
    'is_correct',
    'attempted_at',
  ],
  bookmarks: ['user_id', 'item_type', 'item_id', 'exam_id', 'created_at'],
  simulator_sessions: [
    'user_id',
    'exam_id',
    'started_at',
    'paused_at',
    'submitted_at',
    'expires_at',
    'remaining_seconds',
    'state',
    'answers_json',
    'flagged_json',
  ],
  notification_settings: [
    'user_id',
    'daily_reminder_enabled',
    'daily_reminder_time',
    'streak_risk_enabled',
    'congratulatory_enabled',
    'readiness_80_enabled',
    'quiet_hours_start',
    'quiet_hours_end',
  ],
  readiness_score_notifications: [
    'user_id',
    'exam_id',
    'notification_type',
    'score_at_notification',
    'sent_at',
  ],
  content_update_notifications: ['exam_id', 'content_version', 'published_at', 'notified_at'],
};

/** Column used to scope a table to a user (or `id` for the self table). */
export function scopeColumn(table: string): string {
  return TABLE_SCOPES[table] === 'self' ? 'id' : 'user_id';
}

export function isContentTable(table: string): boolean {
  return TABLE_SCOPES[table] === 'content';
}

export function isPushableTable(table: string): boolean {
  const scope = TABLE_SCOPES[table];
  return scope === 'self' || scope === 'user';
}

/**
 * Pull order: content tables first (parents before children for client FK
 * resolution), then the user's own row, then per-user data.
 */
export const PULL_ORDER: readonly string[] = [
  'exams',
  'topic_domains',
  'blueprint_skills',
  'questions',
  'answer_choices',
  'decks',
  'flashcards',
  'content_update_notifications',
  'users',
  'study_sessions',
  'user_question_attempts',
  'bookmarks',
  'simulator_sessions',
  'notification_settings',
  'readiness_score_notifications',
];

/**
 * Push order: parents before children so foreign keys resolve
 * (users → study_sessions → attempts; the rest depend on users/exams).
 */
export const PUSH_ORDER: readonly string[] = [
  'users',
  'study_sessions',
  'user_question_attempts',
  'bookmarks',
  'simulator_sessions',
  'notification_settings',
  'readiness_score_notifications',
];

function hasWrites(change: TableChange): boolean {
  return Boolean(change.created?.length || change.updated?.length || change.deleted?.length);
}

/** Pull every table's delta since `lastPulledAt`, scoped to `userId`. */
export async function pullChanges(
  store: SyncStore,
  userId: string,
  lastPulledAt: number,
  now: number,
): Promise<{ changes: ChangeSet; timestamp: number }> {
  const changes: ChangeSet = {};
  for (const table of PULL_ORDER) {
    const scope = TABLE_SCOPES[table];
    if (!scope) continue;
    const rows = await store.pullTable(table, scope, userId, lastPulledAt);
    if (rows.created.length || rows.updated.length || rows.deleted.length) {
      changes[table] = { created: rows.created, updated: rows.updated, deleted: rows.deleted };
    }
  }
  return { changes, timestamp: now };
}

export interface PushResult {
  ok: true;
  /** Content/unknown tables that arrived with writes and were not applied. */
  rejectedTables: string[];
}

/**
 * Apply the client's `changes`, scoped to `userId`. Pushable (self/user)
 * tables are upserted/tombstoned in FK-safe order; writes to content or
 * unknown tables are ignored and reported in `rejectedTables`.
 */
export async function pushChanges(
  store: SyncStore,
  userId: string,
  changes: ChangeSet,
  now: number,
): Promise<PushResult> {
  for (const table of PUSH_ORDER) {
    const change = changes[table];
    if (change && hasWrites(change)) {
      await store.pushTable(table, userId, change, now);
    }
  }

  const rejectedTables: string[] = [];
  for (const [table, change] of Object.entries(changes)) {
    if (!isPushableTable(table) && hasWrites(change)) rejectedTables.push(table);
  }
  return { ok: true, rejectedTables };
}
