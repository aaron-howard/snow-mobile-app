/**
 * Repository registry. Domain code receives this object via DI (typically
 * through Zustand stores) rather than importing concrete classes directly.
 *
 * Swap any field to an in-memory fake during tests — domain services
 * depend on the interfaces in `./types`, not the Watermelon impls below.
 */
import { database } from '../database';
import { WatermelonAnswerChoiceRepository } from './WatermelonAnswerChoiceRepository';
import { WatermelonBlueprintSkillRepository } from './WatermelonBlueprintSkillRepository';
import { WatermelonBookmarkRepository } from './WatermelonBookmarkRepository';
import { WatermelonDeckRepository } from './WatermelonDeckRepository';
import { WatermelonExamRepository } from './WatermelonExamRepository';
import { WatermelonFlashcardRepository } from './WatermelonFlashcardRepository';
import {
  WatermelonContentUpdateNotificationRepository,
  WatermelonNotificationSettingsRepository,
  WatermelonReadinessScoreNotificationRepository,
} from './WatermelonNotificationRepositories';
import { WatermelonQuestionRepository } from './WatermelonQuestionRepository';
import { WatermelonSimulatorSessionRepository } from './WatermelonSimulatorSessionRepository';
import { WatermelonStudySessionRepository } from './WatermelonStudySessionRepository';
import { WatermelonTopicDomainRepository } from './WatermelonTopicDomainRepository';
import { WatermelonUserQuestionAttemptRepository } from './WatermelonUserQuestionAttemptRepository';
import { WatermelonUserRepository } from './WatermelonUserRepository';
import type {
  AnswerChoiceRepository,
  BlueprintSkillRepository,
  BookmarkRepository,
  ContentUpdateNotificationRepository,
  DeckRepository,
  ExamRepository,
  FlashcardRepository,
  NotificationSettingsRepository,
  QuestionRepository,
  ReadinessScoreNotificationRepository,
  SimulatorSessionRepository,
  StudySessionRepository,
  TopicDomainRepository,
  UserQuestionAttemptRepository,
  UserRepository,
} from './types';

export interface Repositories {
  users: UserRepository;
  exams: ExamRepository;
  topicDomains: TopicDomainRepository;
  blueprintSkills: BlueprintSkillRepository;
  questions: QuestionRepository;
  answerChoices: AnswerChoiceRepository;
  decks: DeckRepository;
  flashcards: FlashcardRepository;
  studySessions: StudySessionRepository;
  attempts: UserQuestionAttemptRepository;
  bookmarks: BookmarkRepository;
  simulatorSessions: SimulatorSessionRepository;
  notificationSettings: NotificationSettingsRepository;
  readinessScoreNotifications: ReadinessScoreNotificationRepository;
  contentUpdateNotifications: ContentUpdateNotificationRepository;
}

export function createRepositories(): Repositories {
  // Attempt repo is constructed first because QuestionRepo depends on it
  // (review-queue logic counts incorrect attempts).
  const attempts = new WatermelonUserQuestionAttemptRepository(database);

  return {
    users: new WatermelonUserRepository(database),
    exams: new WatermelonExamRepository(database),
    topicDomains: new WatermelonTopicDomainRepository(database),
    blueprintSkills: new WatermelonBlueprintSkillRepository(database),
    questions: new WatermelonQuestionRepository(database, attempts),
    answerChoices: new WatermelonAnswerChoiceRepository(database),
    decks: new WatermelonDeckRepository(database),
    flashcards: new WatermelonFlashcardRepository(database),
    studySessions: new WatermelonStudySessionRepository(database),
    attempts,
    bookmarks: new WatermelonBookmarkRepository(database),
    simulatorSessions: new WatermelonSimulatorSessionRepository(database),
    notificationSettings: new WatermelonNotificationSettingsRepository(database),
    readinessScoreNotifications: new WatermelonReadinessScoreNotificationRepository(database),
    contentUpdateNotifications: new WatermelonContentUpdateNotificationRepository(database),
  };
}

// Re-export every repository interface + DTO so domain code can import from the
// barrel (`@db/repositories`) rather than reaching into `./types` directly.
export * from './types';
