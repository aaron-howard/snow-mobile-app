// The notification-side repositories are grouped here because each is small
// and they're all consumed by the same domain service (NotificationScheduler,
// task 12). When that task lands, this file may be split.

import { Q } from '@nozbe/watermelondb';
import type { Database } from '@nozbe/watermelondb';
import type { NotificationSettings } from '../models/NotificationSettings';
import type { ReadinessScoreNotification } from '../models/ReadinessScoreNotification';
import type { ContentUpdateNotification } from '../models/ContentUpdateNotification';
import type {
  ContentUpdateNotificationDTO,
  ContentUpdateNotificationRepository,
  NotificationSettingsDTO,
  NotificationSettingsRepository,
  ReadinessScoreNotificationDTO,
  ReadinessScoreNotificationRepository,
} from './types';

export class WatermelonNotificationSettingsRepository implements NotificationSettingsRepository {
  constructor(private readonly db: Database) {}

  async get(userId: string): Promise<NotificationSettingsDTO | null> {
    const rows = await this.db
      .get<NotificationSettings>('notification_settings')
      .query(Q.where('user_id', userId))
      .fetch();
    if (!rows[0]) return null;
    const r = rows[0];
    return {
      userId: r.userId,
      dailyReminderEnabled: r.dailyReminderEnabled,
      dailyReminderTime: r.dailyReminderTime,
      streakRiskEnabled: r.streakRiskEnabled,
      congratulatoryEnabled: r.congratulatoryEnabled,
      readiness80Enabled: r.readiness80Enabled,
      quietHoursStart: r.quietHoursStart,
      quietHoursEnd: r.quietHoursEnd,
    };
  }

  async upsert(settings: NotificationSettingsDTO): Promise<void> {
    await this.db.write(async () => {
      const existing = await this.db
        .get<NotificationSettings>('notification_settings')
        .query(Q.where('user_id', settings.userId))
        .fetch();
      if (existing[0]) {
        await existing[0].update((r) => {
          r.dailyReminderEnabled = settings.dailyReminderEnabled;
          r.dailyReminderTime = settings.dailyReminderTime;
          r.streakRiskEnabled = settings.streakRiskEnabled;
          r.congratulatoryEnabled = settings.congratulatoryEnabled;
          r.readiness80Enabled = settings.readiness80Enabled;
          r.quietHoursStart = settings.quietHoursStart;
          r.quietHoursEnd = settings.quietHoursEnd;
        });
      } else {
        await this.db.get<NotificationSettings>('notification_settings').create((r) => {
          r.userId = settings.userId;
          r.dailyReminderEnabled = settings.dailyReminderEnabled;
          r.dailyReminderTime = settings.dailyReminderTime;
          r.streakRiskEnabled = settings.streakRiskEnabled;
          r.congratulatoryEnabled = settings.congratulatoryEnabled;
          r.readiness80Enabled = settings.readiness80Enabled;
          r.quietHoursStart = settings.quietHoursStart;
          r.quietHoursEnd = settings.quietHoursEnd;
        });
      }
    });
  }
}

export class WatermelonReadinessScoreNotificationRepository
  implements ReadinessScoreNotificationRepository
{
  constructor(private readonly db: Database) {}

  async getLast(
    userId: string,
    examId: string,
    type: 'congratulatory' | 'readiness_80',
  ): Promise<ReadinessScoreNotificationDTO | null> {
    const rows = await this.db
      .get<ReadinessScoreNotification>('readiness_score_notifications')
      .query(
        Q.where('user_id', userId),
        Q.where('exam_id', examId),
        Q.where('notification_type', type),
        Q.sortBy('sent_at', Q.desc),
        Q.take(1),
      )
      .fetch();
    if (!rows[0]) return null;
    const r = rows[0];
    return {
      id: r.id,
      userId: r.userId,
      examId: r.examId,
      notificationType: r.notificationType,
      scoreAtNotification: r.scoreAtNotification,
      sentAt: r.sentAt,
    };
  }

  async create(
    notification: Omit<ReadinessScoreNotificationDTO, 'id'>,
  ): Promise<ReadinessScoreNotificationDTO> {
    let created!: ReadinessScoreNotification;
    await this.db.write(async () => {
      created = await this.db
        .get<ReadinessScoreNotification>('readiness_score_notifications')
        .create((r) => {
          r.userId = notification.userId;
          r.examId = notification.examId;
          r.notificationType = notification.notificationType;
          r.scoreAtNotification = notification.scoreAtNotification;
          r.sentAt = notification.sentAt;
        });
    });
    return {
      id: created.id,
      userId: created.userId,
      examId: created.examId,
      notificationType: created.notificationType,
      scoreAtNotification: created.scoreAtNotification,
      sentAt: created.sentAt,
    };
  }
}

export class WatermelonContentUpdateNotificationRepository
  implements ContentUpdateNotificationRepository
{
  constructor(private readonly db: Database) {}

  async listUnsent(): Promise<ContentUpdateNotificationDTO[]> {
    const rows = await this.db
      .get<ContentUpdateNotification>('content_update_notifications')
      .query(Q.where('notified_at', null))
      .fetch();
    return rows.map((r) => ({
      id: r.id,
      examId: r.examId,
      contentVersion: r.contentVersion,
      publishedAt: r.publishedAt,
      notifiedAt: r.notifiedAt,
    }));
  }

  async markNotified(id: string, notifiedAt: number): Promise<void> {
    await this.db.write(async () => {
      const row = await this.db.get<ContentUpdateNotification>('content_update_notifications').find(id);
      await row.update((r) => {
        r.notifiedAt = notifiedAt;
      });
    });
  }
}
