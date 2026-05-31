import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { dbSchema } from './schema';
import {
  AnswerChoice,
  Bookmark,
  BlueprintSkill,
  ContentUpdateNotification,
  Deck,
  Exam,
  Flashcard,
  NotificationSettings,
  Question,
  ReadinessScoreNotification,
  SimulatorSession,
  StudySession,
  TopicDomain,
  User,
  UserQuestionAttempt,
} from './models';

/**
 * Single WatermelonDB database instance used app-wide.
 *
 * The SQLite adapter uses JSI when available (set `jsi: true`) for sync
 * speed on the new architecture. The legacy bridge fallback is automatic.
 */
const adapter = new SQLiteAdapter({
  schema: dbSchema,
  // jsi: true requires a custom dev client (which we use — see expo-dev-client in package.json).
  jsi: true,
  onSetUpError: (error) => {
    // Surface DB setup errors loudly; the app cannot function without storage.
    // eslint-disable-next-line no-console
    console.error('[db] failed to set up SQLite adapter', error);
  },
});

export const database = new Database({
  adapter,
  modelClasses: [
    User,
    Exam,
    TopicDomain,
    BlueprintSkill,
    Question,
    AnswerChoice,
    Deck,
    Flashcard,
    StudySession,
    UserQuestionAttempt,
    Bookmark,
    SimulatorSession,
    NotificationSettings,
    ReadinessScoreNotification,
    ContentUpdateNotification,
  ],
});
