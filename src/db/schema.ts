import { appSchema, tableSchema } from '@nozbe/watermelondb';

/**
 * WatermelonDB schema for SN Cert Prep.
 *
 * Mirrors the data models in design.md exactly. Column types are limited to
 * WatermelonDB's primitives: string, number, boolean. JSON-shaped values
 * (e.g. simulator_sessions.answers, simulator_sessions.flagged_questions)
 * are stored as strings and serialised at the repository layer.
 *
 * Dates are stored as Unix timestamps (ms) in `number` columns named with the
 * `_at` suffix. The WatermelonDB convention `_id` is used for foreign keys.
 */
export const dbSchema = appSchema({
  version: 1,
  tables: [
    // ---------------------------------------------------------------------
    // users — `id` is the Clerk user ID; profile data is synced from the
    // Worker on first sign-in and stays in step via WatermelonDB sync.
    // ---------------------------------------------------------------------
    tableSchema({
      name: 'users',
      columns: [
        { name: 'email', type: 'string' },
        { name: 'display_name', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'streak_current', type: 'number' },
        { name: 'streak_longest', type: 'number' },
        { name: 'total_questions_answered', type: 'number' },
        { name: 'total_study_sessions', type: 'number' },
      ],
    }),

    // ---------------------------------------------------------------------
    // exams
    // ---------------------------------------------------------------------
    tableSchema({
      name: 'exams',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'certification_level', type: 'string' },
        { name: 'estimated_study_hours', type: 'number' },
        { name: 'official_duration_minutes', type: 'number' },
        { name: 'official_question_count', type: 'number' },
        { name: 'official_passing_score', type: 'number' },
        { name: 'minimum_question_count', type: 'number' },
        { name: 'content_version', type: 'string' },
        { name: 'content_downloaded_at', type: 'number', isOptional: true },
        { name: 'is_enrolled', type: 'boolean' },
        { name: 'enrolled_at', type: 'number', isOptional: true },
      ],
    }),

    // ---------------------------------------------------------------------
    // topic_domains
    // ---------------------------------------------------------------------
    tableSchema({
      name: 'topic_domains',
      columns: [
        { name: 'exam_id', type: 'string', isIndexed: true },
        { name: 'name', type: 'string' },
        { name: 'weight_percent', type: 'number' },
      ],
    }),

    // ---------------------------------------------------------------------
    // blueprint_skills (new per Requirement 11.5 — content provenance)
    // ---------------------------------------------------------------------
    tableSchema({
      name: 'blueprint_skills',
      columns: [
        { name: 'exam_id', type: 'string', isIndexed: true },
        { name: 'domain_id', type: 'string', isIndexed: true },
        { name: 'code', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'blueprint_source_url', type: 'string' },
        { name: 'blueprint_retrieved_at', type: 'number' },
      ],
    }),

    // ---------------------------------------------------------------------
    // questions
    // ---------------------------------------------------------------------
    tableSchema({
      name: 'questions',
      columns: [
        { name: 'exam_id', type: 'string', isIndexed: true },
        { name: 'domain_id', type: 'string', isIndexed: true },
        { name: 'blueprint_skill_id', type: 'string', isIndexed: true },
        { name: 'text', type: 'string' },
        { name: 'image_url', type: 'string', isOptional: true },
        { name: 'image_alt_text', type: 'string' },
        { name: 'explanation', type: 'string' },
        { name: 'difficulty_level', type: 'string' }, // 'easy' | 'medium' | 'hard'
        { name: 'blooms_level', type: 'string' }, // 'remember' | 'understand' | 'apply' | 'analyze'
        { name: 'author_id', type: 'string' },
        { name: 'source_notes', type: 'string' },
        { name: 'review_status', type: 'string', isIndexed: true }, // 'draft' | 'reviewed' | 'published'
        { name: 'reviewed_by', type: 'string', isOptional: true },
        { name: 'reviewed_at', type: 'number', isOptional: true },
        { name: 'published_at', type: 'number', isOptional: true },
        { name: 'times_answered', type: 'number' },
        { name: 'times_answered_correctly', type: 'number' },
        { name: 'is_pool_reset', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // ---------------------------------------------------------------------
    // answer_choices
    // ---------------------------------------------------------------------
    tableSchema({
      name: 'answer_choices',
      columns: [
        { name: 'question_id', type: 'string', isIndexed: true },
        { name: 'text', type: 'string' },
        { name: 'is_correct', type: 'boolean' },
        { name: 'sort_order', type: 'number' },
      ],
    }),

    // ---------------------------------------------------------------------
    // decks
    // ---------------------------------------------------------------------
    tableSchema({
      name: 'decks',
      columns: [
        { name: 'exam_id', type: 'string', isIndexed: true },
        { name: 'domain_id', type: 'string', isOptional: true },
        { name: 'name', type: 'string' },
        { name: 'is_custom', type: 'boolean' },
      ],
    }),

    // ---------------------------------------------------------------------
    // flashcards
    // ---------------------------------------------------------------------
    tableSchema({
      name: 'flashcards',
      columns: [
        { name: 'deck_id', type: 'string', isIndexed: true },
        { name: 'term', type: 'string' },
        { name: 'definition', type: 'string' },
        { name: 'is_custom', type: 'boolean' },
        // SM-2 state
        { name: 'ease_factor', type: 'number' },
        { name: 'interval_days', type: 'number' },
        { name: 'repetition_count', type: 'number' },
        { name: 'next_review_at', type: 'number' },
        { name: 'last_reviewed_at', type: 'number', isOptional: true },
      ],
    }),

    // ---------------------------------------------------------------------
    // study_sessions
    // ---------------------------------------------------------------------
    tableSchema({
      name: 'study_sessions',
      columns: [
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'exam_id', type: 'string', isIndexed: true },
        { name: 'session_type', type: 'string' }, // 'quiz' | 'flashcard' | 'simulator'
        { name: 'started_at', type: 'number' },
        { name: 'completed_at', type: 'number', isOptional: true },
        { name: 'score', type: 'number', isOptional: true },
        { name: 'total_questions', type: 'number' },
        { name: 'correct_answers', type: 'number' },
        { name: 'duration_seconds', type: 'number' },
      ],
    }),

    // ---------------------------------------------------------------------
    // user_question_attempts
    // ---------------------------------------------------------------------
    tableSchema({
      name: 'user_question_attempts',
      columns: [
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'question_id', type: 'string', isIndexed: true },
        { name: 'session_id', type: 'string', isIndexed: true },
        { name: 'selected_answer_id', type: 'string' },
        { name: 'is_correct', type: 'boolean' },
        { name: 'attempted_at', type: 'number' },
      ],
    }),

    // ---------------------------------------------------------------------
    // bookmarks
    // ---------------------------------------------------------------------
    tableSchema({
      name: 'bookmarks',
      columns: [
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'item_type', type: 'string' }, // 'question' | 'flashcard'
        { name: 'item_id', type: 'string', isIndexed: true },
        { name: 'exam_id', type: 'string', isIndexed: true },
        { name: 'created_at', type: 'number' },
      ],
    }),

    // ---------------------------------------------------------------------
    // simulator_sessions
    // ---------------------------------------------------------------------
    tableSchema({
      name: 'simulator_sessions',
      columns: [
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'exam_id', type: 'string', isIndexed: true },
        { name: 'started_at', type: 'number' },
        { name: 'paused_at', type: 'number', isOptional: true },
        { name: 'submitted_at', type: 'number', isOptional: true },
        { name: 'expires_at', type: 'number' }, // started_at + 90d retention (Req 5.7)
        { name: 'remaining_seconds', type: 'number' },
        { name: 'state', type: 'string' }, // 'active' | 'paused' | 'submitted' | 'discarded'
        { name: 'answers_json', type: 'string' }, // JSON: { [questionId]: answerId }
        { name: 'flagged_json', type: 'string' }, // JSON: string[]
      ],
    }),

    // ---------------------------------------------------------------------
    // notification_settings
    // ---------------------------------------------------------------------
    tableSchema({
      name: 'notification_settings',
      columns: [
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'daily_reminder_enabled', type: 'boolean' },
        { name: 'daily_reminder_time', type: 'string' }, // "HH:MM"
        { name: 'streak_risk_enabled', type: 'boolean' },
        { name: 'congratulatory_enabled', type: 'boolean' },
        { name: 'readiness_80_enabled', type: 'boolean' },
        { name: 'quiet_hours_start', type: 'string', isOptional: true },
        { name: 'quiet_hours_end', type: 'string', isOptional: true },
      ],
    }),

    // ---------------------------------------------------------------------
    // readiness_score_notifications
    // ---------------------------------------------------------------------
    tableSchema({
      name: 'readiness_score_notifications',
      columns: [
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'exam_id', type: 'string', isIndexed: true },
        { name: 'notification_type', type: 'string' }, // 'congratulatory' | 'readiness_80'
        { name: 'score_at_notification', type: 'number' },
        { name: 'sent_at', type: 'number' },
      ],
    }),

    // ---------------------------------------------------------------------
    // content_update_notifications
    // ---------------------------------------------------------------------
    tableSchema({
      name: 'content_update_notifications',
      columns: [
        { name: 'exam_id', type: 'string', isIndexed: true },
        { name: 'content_version', type: 'string' },
        { name: 'published_at', type: 'number' },
        { name: 'notified_at', type: 'number', isOptional: true },
      ],
    }),
  ],
});
