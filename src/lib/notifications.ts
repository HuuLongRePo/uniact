/**
 * Notification System - Strategy + Template Method Pattern
 *
 * Allows flexible notification delivery through multiple channels
 * and customizable notification templates
 */

import { dbRun, dbGet, dbAll, dbHelpers } from './database';
import { createRealtimeEventForUser, recordRealtimeMetric } from '@/lib/realtime-notifications';
import {
  RealtimeNotificationActionButton,
  RealtimeNotificationPriority,
} from '@/lib/realtime-notification-model';

// ============ STRATEGY PATTERN ============

/**
 * Interface for notification delivery channels
 */
export interface NotificationChannel {
  send(recipient: string, notification: Notification): Promise<boolean>;
  getName(): string;
}

/**
 * Database notification channel (default)
 */
export class DatabaseNotificationChannel implements NotificationChannel {
  async send(recipient: string, notification: Notification): Promise<boolean> {
    try {
      await dbRun(
        `INSERT INTO notifications (user_id, type, title, message, related_table, related_id, is_read)
         VALUES (?, ?, ?, ?, ?, ?, 0)`,
        [
          recipient,
          notification.type,
          notification.title,
          notification.message,
          notification.related_table,
          notification.related_id,
        ]
      );
      return true;
    } catch (error) {
      console.error('Database notification error:', error);
      return false;
    }
  }

  getName(): string {
    return 'database';
  }
}

/**
 * Email notification channel (stub for future implementation)
 */
// Email & SMS channels removed for offline LAN deployment.
// If needed in future, reintroduce implementations guarded by feature flags.

/**
 * Factory for creating notification channels
 */
export class NotificationChannelFactory {
  private static channels = new Map<string, NotificationChannel>([
    ['database', new DatabaseNotificationChannel()],
  ]);

  static getChannel(name: string): NotificationChannel {
    const channel = this.channels.get(name);
    if (!channel) {
      throw new Error(`Unknown notification channel: ${name}`);
    }
    return channel;
  }

  static getAllChannels(): NotificationChannel[] {
    return Array.from(this.channels.values());
  }
}

// ============ TEMPLATE METHOD PATTERN ============

export interface Notification {
  type: string;
  title: string;
  message: string;
  related_table?: string;
  related_id?: number;
}

export type NotificationAuditEvent = {
  actorId: number;
  action: string;
  targetTable?: string;
  targetId?: number | null;
  details?: unknown;
};

export async function sendDatabaseNotification(params: {
  userId: number;
  type: string;
  title: string;
  message: string;
  relatedTable?: string | null;
  relatedId?: number | null;
  eventType?: string;
  actorId?: number | null;
  priority?: RealtimeNotificationPriority;
  ttlSeconds?: number;
  actionButtons?: RealtimeNotificationActionButton[];
  metadata?: unknown;
  dedupeWithinSeconds?: number;
}) {
  const dedupeWindow = Math.max(0, Math.min(300, Number(params.dedupeWithinSeconds || 0)));
  if (dedupeWindow > 0) {
    const duplicated = (await dbGet(
      `SELECT id
       FROM notifications
       WHERE user_id = ?
         AND type = ?
         AND title = ?
         AND message = ?
         AND COALESCE(related_table, '') = COALESCE(?, '')
         AND COALESCE(related_id, -1) = COALESCE(?, -1)
         AND created_at >= datetime('now', ?)
       ORDER BY id DESC
       LIMIT 1`,
      [
        params.userId,
        params.type,
        params.title,
        params.message,
        params.relatedTable || null,
        params.relatedId || null,
        `-${dedupeWindow} seconds`,
      ]
    )) as { id?: number } | null;

    if (duplicated?.id) {
      return { notificationId: Number(duplicated.id), eventId: null, deduped: true };
    }
  }

  const result = await dbRun(
    `INSERT INTO notifications (user_id, type, title, message, related_table, related_id, is_read)
     VALUES (?, ?, ?, ?, ?, ?, 0)`,
    [
      params.userId,
      params.type,
      params.title,
      params.message,
      params.relatedTable || null,
      params.relatedId || null,
    ]
  );

  const notificationId = Number(result.lastID || 0);
  let eventId: number | null = null;

  try {
    const realtimeEvent = await createRealtimeEventForUser({
      userId: params.userId,
      notificationId,
      eventType: params.eventType || params.type || 'notification',
      actorId: params.actorId || null,
      priority: params.priority || 'normal',
      ttlSeconds: params.ttlSeconds,
      actionButtons: params.actionButtons || [],
      notificationType: params.type,
      title: params.title,
      message: params.message,
      relatedTable: params.relatedTable || null,
      relatedId: params.relatedId || null,
      metadata: params.metadata || null,
    });

    eventId = realtimeEvent.event_id;
    await recordRealtimeMetric({
      metricType: 'delivery_success',
      userId: params.userId,
      eventId,
      details: {
        event_type: realtimeEvent.event_type,
        notification_id: notificationId,
      },
    });
  } catch (realtimeError) {
    console.error('Realtime event creation error:', realtimeError);
    await recordRealtimeMetric({
      metricType: 'delivery_fail',
      userId: params.userId,
      details: {
        reason: 'realtime_event_creation_failed',
        notification_id: notificationId,
      },
    }).catch(() => undefined);
  }

  return { notificationId, eventId, deduped: false };
}

export async function sendBulkDatabaseNotifications(params: {
  userIds: number[];
  type: string;
  title: string;
  message: string;
  relatedTable?: string | null;
  relatedId?: number | null;
  audit?: NotificationAuditEvent;
  eventType?: string;
  actorId?: number | null;
  priority?: RealtimeNotificationPriority;
  ttlSeconds?: number;
  actionButtons?: RealtimeNotificationActionButton[];
  metadata?: unknown;
  dedupeWithinSeconds?: number;
}) {
  const uniqueUserIds = Array.from(
    new Set(
      params.userIds
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0)
    )
  );

  let created = 0;
  let skipped = 0;
  let failed = 0;
  const failedUserIds: number[] = [];
  for (const userId of uniqueUserIds) {
    try {
      const sendResult = await sendDatabaseNotification({
        userId,
        type: params.type,
        title: params.title,
        message: params.message,
        relatedTable: params.relatedTable,
        relatedId: params.relatedId,
        eventType: params.eventType,
        actorId: params.actorId,
        priority: params.priority,
        ttlSeconds: params.ttlSeconds,
        actionButtons: params.actionButtons,
        metadata: params.metadata,
        dedupeWithinSeconds: params.dedupeWithinSeconds,
      });

      if (sendResult.deduped) {
        skipped += 1;
      } else {
        created += 1;
      }
    } catch (error) {
      console.error(`Failed to send notification to user ${userId}:`, error);
      failed += 1;
      failedUserIds.push(userId);
      await recordRealtimeMetric({
        metricType: 'delivery_fail',
        userId,
        details: {
          reason: 'notification_insert_failed',
          error: error instanceof Error ? error.message : 'unknown_error',
        },
      }).catch(() => undefined);
    }
  }

  if (params.audit) {
    await dbHelpers.createAuditLog(
      params.audit.actorId,
      params.audit.action,
      params.audit.targetTable || 'notifications',
      params.audit.targetId || null,
      typeof params.audit.details === 'string'
        ? params.audit.details
        : JSON.stringify(params.audit.details || {})
    );
  }

  return { created, targetCount: uniqueUserIds.length, skipped, failed, failedUserIds };
}

export async function getTeacherManagedStudentIds(teacherId: number): Promise<number[]> {
  const rows = (await dbAll(
    `SELECT DISTINCT u.id
     FROM users u
     INNER JOIN classes c ON c.id = u.class_id
     LEFT JOIN class_teachers ct ON ct.class_id = c.id
     WHERE u.role = 'student'
       AND COALESCE(u.is_active, 1) = 1
       AND (c.teacher_id = ? OR ct.teacher_id = ?)
     ORDER BY u.id`,
    [teacherId, teacherId]
  )) as Array<{ id: number }>;

  return rows.map((row) => Number(row.id)).filter((id) => Number.isInteger(id) && id > 0);
}

export async function getManagedActivityParticipantIds(teacherId: number, activityIds: number[]) {
  const uniqueActivityIds = Array.from(
    new Set(
      activityIds
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0)
    )
  );

  if (uniqueActivityIds.length === 0) {
    return [];
  }

  const placeholders = uniqueActivityIds.map(() => '?').join(',');
  const rows = (await dbAll(
    `SELECT DISTINCT p.student_id as id
     FROM participations p
     INNER JOIN activities a ON a.id = p.activity_id
     WHERE p.activity_id IN (${placeholders})
       AND a.teacher_id = ?
       AND p.student_id IS NOT NULL`,
    [...uniqueActivityIds, teacherId]
  )) as Array<{ id: number }>;

  return rows.map((row) => Number(row.id)).filter((id) => Number.isInteger(id) && id > 0);
}

export async function ensureScheduledNotificationsTable() {
  await dbRun(
    `CREATE TABLE IF NOT EXISTS scheduled_notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      student_ids TEXT NOT NULL,
      scheduled_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sender_id) REFERENCES users(id)
    )`
  );
}

/**
 * Abstract base class for notification builders
 * Implements Template Method pattern
 */
export abstract class NotificationBuilder {
  /**
   * Template method - defines the algorithm skeleton
   */
  async build(data: any): Promise<Notification> {
    const type = this.getType();
    const title = this.buildTitle(data);
    const message = this.buildMessage(data);
    const { related_table, related_id } = this.buildRelatedInfo(data);

    // Hook for subclasses to modify notification
    return this.customize({
      type,
      title,
      message,
      related_table,
      related_id,
    });
  }

  // Abstract methods - must be implemented by subclasses
  protected abstract getType(): string;
  protected abstract buildTitle(data: any): string;
  protected abstract buildMessage(data: any): string;

  // Hook methods - can be overridden
  protected buildRelatedInfo(data: any): { related_table?: string; related_id?: number } {
    return {};
  }

  protected customize(notification: Notification): Notification {
    return notification;
  }
}

/**
 * Activity registration notification
 */
export class ActivityRegistrationNotification extends NotificationBuilder {
  protected getType(): string {
    return 'registration';
  }

  protected buildTitle(data: { activity_title: string }): string {
    return 'Đăng ký thành công';
  }

  protected buildMessage(data: { activity_title: string; date_time: string }): string {
    return `Bạn đã đăng ký hoạt động "${data.activity_title}" thành công. Thời gian: ${new Date(data.date_time).toLocaleString('vi-VN')}`;
  }

  protected buildRelatedInfo(data: { activity_id: number }) {
    return {
      related_table: 'activities',
      related_id: data.activity_id,
    };
  }
}

/**
 * Evaluation notification
 */
export class EvaluationNotification extends NotificationBuilder {
  protected getType(): string {
    return 'evaluation';
  }

  protected buildTitle(data: any): string {
    return 'Đánh giá hoạt động';
  }

  protected buildMessage(data: {
    activity_title: string;
    achievement_level: string;
    total_points: number;
  }): string {
    const levels = {
      excellent: 'Xuất sắc',
      good: 'Tốt',
      participated: 'Tham gia',
    };
    return `Hoạt động "${data.activity_title}" đã được đánh giá: ${levels[data.achievement_level as keyof typeof levels]} (+${data.total_points} điểm)`;
  }

  protected buildRelatedInfo(data: { participation_id: number }) {
    return {
      related_table: 'participations',
      related_id: data.participation_id,
    };
  }
}

/**
 * Reminder notification
 */
export class ReminderNotification extends NotificationBuilder {
  protected getType(): string {
    return 'reminder';
  }

  protected buildTitle(data: any): string {
    return 'Nhắc nhở hoạt động';
  }

  protected buildMessage(data: { activity_title: string; hours_until: number }): string {
    return `Hoạt động "${data.activity_title}" sẽ bắt đầu trong ${data.hours_until} giờ nữa. Vui lòng chuẩn bị!`;
  }

  protected buildRelatedInfo(data: { activity_id: number }) {
    return {
      related_table: 'activities',
      related_id: data.activity_id,
    };
  }
}

// ============ NOTIFICATION SERVICE ============

/**
 * Main notification service
 * Coordinates channels and builders
 */
export class NotificationService {
  /**
   * Send notification through specified channels
   */
  async send(
    recipients: Array<string | number>,
    builder: NotificationBuilder,
    data: any,
    channels: string[] = ['database']
  ): Promise<{ success: number; failed: number }> {
    const notification = await builder.build(data);
    let success = 0;
    let failed = 0;

    for (const recipient of recipients) {
      const recipientId = String(recipient);
      for (const channelName of channels) {
        try {
          const channel = NotificationChannelFactory.getChannel(channelName);
          const sent = await channel.send(recipientId, notification);
          if (sent) {
            success++;
          } else {
            failed++;
          }
        } catch (error) {
          console.error(`Failed to send notification via ${channelName}:`, error);
          failed++;
        }
      }
    }

    return { success, failed };
  }

  /**
   * Send bulk notifications
   */
  async sendBulk(
    recipients: Array<string | number>,
    builder: NotificationBuilder,
    data: any,
    channels: string[] = ['database']
  ): Promise<void> {
    const notification = await builder.build(data);

    // Process in batches to avoid overwhelming the system
    const batchSize = 50;
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (recipient) => {
          const recipientId = String(recipient);
          for (const channelName of channels) {
            const channel = NotificationChannelFactory.getChannel(channelName);
            await channel.send(recipientId, notification);
          }
        })
      );
    }
  }
}

// Singleton instance
export const notificationService = new NotificationService();

// ============ USAGE EXAMPLES ============

/*
// Example 1: Send activity registration notification (offline only)
await notificationService.send(
  [studentId],
  new ActivityRegistrationNotification(),
  {
    activity_title: 'Hội thảo khoa học',
    activity_id: 123,
    date_time: '2025-12-01T09:00:00'
  },
  ['database']
)

// Example 2: Send evaluation notification
await notificationService.send(
  [studentId],
  new EvaluationNotification(),
  {
    activity_title: 'Hội thảo khoa học',
    achievement_level: 'excellent',
    total_points: 50,
    participation_id: 456
  }
)

// Example 3: Send reminder to multiple students
await notificationService.sendBulk(
  studentIds,
  new ReminderNotification(),
  {
    activity_title: 'Hội thảo khoa học',
    activity_id: 123,
    hours_until: 24
  }
)
*/
