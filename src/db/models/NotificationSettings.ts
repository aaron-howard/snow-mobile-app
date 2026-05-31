import { Model } from '@nozbe/watermelondb';
import { field, text } from '@nozbe/watermelondb/decorators';

export class NotificationSettings extends Model {
  static table = 'notification_settings';

  @text('user_id') userId!: string;
  @field('daily_reminder_enabled') dailyReminderEnabled!: boolean;
  @text('daily_reminder_time') dailyReminderTime!: string; // "HH:MM"
  @field('streak_risk_enabled') streakRiskEnabled!: boolean;
  @field('congratulatory_enabled') congratulatoryEnabled!: boolean;
  @field('readiness_80_enabled') readiness80Enabled!: boolean;
  @text('quiet_hours_start') quietHoursStart!: string | null;
  @text('quiet_hours_end') quietHoursEnd!: string | null;
}
