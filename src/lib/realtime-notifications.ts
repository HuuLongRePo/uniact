import { dbAll, dbGet, dbRun } from '@/lib/database';
import {
  clampToastTtlSeconds,
  isRealtimePriority,
  normalizeActionButtons,
  RealtimeNotificationActionButton,
  RealtimeNotificationEvent,
  RealtimeNotificationPriority,
} from '@/lib/realtime-notification-model';

type RealtimeMetricType =
  | 'delivery_success'
  | 'delivery_fail'
  | 'stream_connect'
  | 'stream_reconnect'
  | 'stream_disconnect';

type CreateRealtimeEventParams = {
  userId: number;
  notificationId?: number | null;
  eventType: string;
  actorId?: number | null;
  priority?: RealtimeNotificationPriority | string | null;
  ttlSeconds?: number | null;
  actionButtons?: RealtimeNotificationActionButton[] | unknown;
  notificationType: string;
  title: string;
  message: string;
  relatedTable?: string | null;
  relatedId?: number | null;
  metadata?: unknown;
};

let realtimeTablesReadyPromise: Promise<void> | null = null;

export async function ensureRealtimeNotificationTables() {
  if (!realtimeTablesReadyPromise) {
    realtimeTablesReadyPromise = (async () => {
      await dbRun(`
        CREATE TABLE IF NOT EXISTS notification_realtime_events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          notification_id INTEGER,
          event_type TEXT NOT NULL,
          actor_id INTEGER,
          priority TEXT NOT NULL DEFAULT 'normal',
          ttl_seconds INTEGER NOT NULL DEFAULT 7,
          action_buttons_json TEXT,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          notification_type TEXT NOT NULL DEFAULT 'system',
          related_table TEXT,
          related_id INTEGER,
          metadata_json TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (notification_id) REFERENCES notifications(id)
        )
      `);

      await dbRun(`
        CREATE INDEX IF NOT EXISTS idx_notification_realtime_events_user_cursor
        ON notification_realtime_events(user_id, id)
      `);

      await dbRun(`
        CREATE TABLE IF NOT EXISTS notification_realtime_metrics (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          metric_type TEXT NOT NULL,
          user_id INTEGER,
          event_id INTEGER,
          details_json TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (event_id) REFERENCES notification_realtime_events(id)
        )
      `);

      await dbRun(`
        CREATE INDEX IF NOT EXISTS idx_notification_realtime_metrics_type_time
        ON notification_realtime_metrics(metric_type, created_at)
      `);

      await dbRun(`
        CREATE INDEX IF NOT EXISTS idx_notification_realtime_metrics_user_time
        ON notification_realtime_metrics(user_id, created_at)
      `);
    })().catch((error) => {
      realtimeTablesReadyPromise = null;
      throw error;
    });
  }

  return realtimeTablesReadyPromise;
}

function parseJsonArray<T>(raw: unknown): T[] {
  if (!raw || typeof raw !== 'string') {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export async function createRealtimeEventForUser(
  params: CreateRealtimeEventParams
): Promise<RealtimeNotificationEvent> {
  await ensureRealtimeNotificationTables();

  const priority = isRealtimePriority(params.priority) ? params.priority : 'normal';
  const ttlSeconds = clampToastTtlSeconds(priority, params.ttlSeconds);
  const actionButtons = normalizeActionButtons(params.actionButtons);
  const eventType = String(params.eventType || '').trim() || 'notification';

  const insertResult = await dbRun(
    `INSERT INTO notification_realtime_events
      (user_id, notification_id, event_type, actor_id, priority, ttl_seconds, action_buttons_json,
       title, message, notification_type, related_table, related_id, metadata_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [
      params.userId,
      params.notificationId || null,
      eventType,
      params.actorId || null,
      priority,
      ttlSeconds,
      actionButtons.length ? JSON.stringify(actionButtons) : null,
      params.title,
      params.message,
      params.notificationType || 'system',
      params.relatedTable || null,
      params.relatedId || null,
      params.metadata ? JSON.stringify(params.metadata) : null,
    ]
  );

  const eventId = Number(insertResult.lastID || 0);
  const createdRow = (await dbGet(
    'SELECT created_at FROM notification_realtime_events WHERE id = ?',
    [eventId]
  )) as { created_at?: string } | undefined;

  return {
    event_id: eventId,
    event_type: eventType,
    actor_id: params.actorId || null,
    target_user_ids: [params.userId],
    priority,
    ttl_seconds: ttlSeconds,
    action_buttons: actionButtons,
    notification: {
      id: params.notificationId || null,
      type: params.notificationType || 'system',
      title: params.title,
      message: params.message,
      related_table: params.relatedTable || null,
      related_id: params.relatedId || null,
      created_at: createdRow?.created_at || new Date().toISOString(),
    },
    created_at: createdRow?.created_at || new Date().toISOString(),
  };
}

export async function listRealtimeEventsForUser(params: {
  userId: number;
  afterEventId?: number;
  limit?: number;
}) {
  await ensureRealtimeNotificationTables();

  const cursor = Number.isFinite(Number(params.afterEventId)) ? Number(params.afterEventId) : 0;
  const limit = Math.min(Math.max(Number(params.limit || 25), 1), 100);

  const rows = (await dbAll(
    `SELECT
       id,
       user_id,
       notification_id,
       event_type,
       actor_id,
       priority,
       ttl_seconds,
       action_buttons_json,
       title,
       message,
       notification_type,
       related_table,
       related_id,
       created_at
     FROM notification_realtime_events
     WHERE user_id = ? AND id > ?
     ORDER BY id ASC
     LIMIT ?`,
    [params.userId, cursor, limit]
  )) as Array<{
    id: number;
    user_id: number;
    notification_id: number | null;
    event_type: string;
    actor_id: number | null;
    priority: string;
    ttl_seconds: number;
    action_buttons_json: string | null;
    title: string;
    message: string;
    notification_type: string;
    related_table: string | null;
    related_id: number | null;
    created_at: string;
  }>;

  return rows.map((row): RealtimeNotificationEvent => {
    const priority = isRealtimePriority(row.priority) ? row.priority : 'normal';
    const ttlSeconds = clampToastTtlSeconds(priority, row.ttl_seconds);

    return {
      event_id: Number(row.id),
      event_type: row.event_type || 'notification',
      actor_id: row.actor_id ? Number(row.actor_id) : null,
      target_user_ids: [Number(row.user_id)],
      priority,
      ttl_seconds: ttlSeconds,
      action_buttons: normalizeActionButtons(
        parseJsonArray<RealtimeNotificationActionButton>(row.action_buttons_json)
      ),
      notification: {
        id: row.notification_id ? Number(row.notification_id) : null,
        type: row.notification_type || 'system',
        title: row.title,
        message: row.message,
        related_table: row.related_table || null,
        related_id: row.related_id ? Number(row.related_id) : null,
        created_at: row.created_at,
      },
      created_at: row.created_at,
    };
  });
}

export async function recordRealtimeMetric(params: {
  metricType: RealtimeMetricType;
  userId?: number | null;
  eventId?: number | null;
  details?: unknown;
}) {
  await ensureRealtimeNotificationTables();

  await dbRun(
    `INSERT INTO notification_realtime_metrics (metric_type, user_id, event_id, details_json, created_at)
     VALUES (?, ?, ?, ?, datetime('now'))`,
    [
      params.metricType,
      params.userId || null,
      params.eventId || null,
      params.details ? JSON.stringify(params.details) : null,
    ]
  );
}
