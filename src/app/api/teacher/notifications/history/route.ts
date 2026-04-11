import { NextRequest } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { dbAll, dbReady, dbRun } from '@/lib/database';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

type BroadcastNotificationSummary = {
  id: number;
  title: string;
  message: string;
  target_type: string;
  target_names: string | null;
  recipient_count: number;
  delivered_count: number;
  read_count: number;
  unread_count: number;
  read_rate: number;
  sent_at: string | null;
  created_at: string;
};

type NotificationHistoryRecord = {
  id: number;
  notification_id: number;
  notification_title: string;
  student_id: number;
  student_name: string;
  class_name: string;
  sent_at: string;
  read_at?: string | null;
  is_read: boolean;
  read_on_device: 'unknown';
};

async function ensureBroadcastTables() {
  await dbRun(`
    CREATE TABLE IF NOT EXISTS broadcast_notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      target_type TEXT NOT NULL CHECK(target_type IN ('all','class','grade')),
      target_ids TEXT,
      target_names TEXT,
      scheduled_at TEXT,
      sent_at TEXT,
      recipient_count INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL CHECK(status IN ('draft','scheduled','sent')),
      created_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );
  `);

  await dbRun(
    `CREATE INDEX IF NOT EXISTS idx_broadcast_notifications_created_by ON broadcast_notifications(created_by, created_at);`
  );
}

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toBoolean(value: unknown): boolean {
  return Number(value) > 0 || value === true;
}

export async function GET(request: NextRequest) {
  try {
    await dbReady();
    await ensureBroadcastTables();

    const token = request.cookies.get('token')?.value;
    if (!token) return errorResponse(ApiError.unauthorized('Chưa đăng nhập'));

    const user = await getUserFromToken(token);
    if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
      return errorResponse(ApiError.forbidden('Không có quyền truy cập'));
    }

    const notifications = ((await dbAll(
      `
      SELECT
        bn.id,
        bn.title,
        bn.message,
        bn.target_type,
        bn.target_names,
        bn.recipient_count,
        COUNT(n.id) as delivered_count,
        SUM(CASE WHEN COALESCE(n.is_read, 0) = 1 THEN 1 ELSE 0 END) as read_count,
        COALESCE(bn.sent_at, bn.created_at) as sent_at,
        bn.created_at
      FROM broadcast_notifications bn
      LEFT JOIN notifications n
        ON n.related_table = 'broadcast_notifications'
       AND n.related_id = bn.id
      WHERE bn.created_by = ?
        AND bn.status = 'sent'
      GROUP BY bn.id
      ORDER BY datetime(COALESCE(bn.sent_at, bn.created_at)) DESC, bn.id DESC
      LIMIT 100
      `,
      [user.id]
    )) as any[]).map((row) => {
      const recipientCount = toNumber(row.recipient_count);
      const deliveredCount = toNumber(row.delivered_count || row.recipient_count);
      const readCount = toNumber(row.read_count);
      const unreadCount = Math.max(deliveredCount - readCount, 0);

      const summary: BroadcastNotificationSummary = {
        id: toNumber(row.id),
        title: String(row.title || ''),
        message: String(row.message || ''),
        target_type: String(row.target_type || 'all'),
        target_names: row.target_names ? String(row.target_names) : null,
        recipient_count: recipientCount,
        delivered_count: deliveredCount,
        read_count: readCount,
        unread_count: unreadCount,
        read_rate: deliveredCount > 0 ? (readCount / deliveredCount) * 100 : 0,
        sent_at: row.sent_at ? String(row.sent_at) : null,
        created_at: String(row.created_at || row.sent_at || ''),
      };

      return summary;
    });

    const records = ((await dbAll(
      `
      SELECT
        n.id,
        bn.id as notification_id,
        bn.title as notification_title,
        u.id as student_id,
        u.name as student_name,
        c.name as class_name,
        n.created_at as sent_at,
        NULL as read_at,
        COALESCE(n.is_read, 0) as is_read
      FROM broadcast_notifications bn
      INNER JOIN notifications n
        ON n.related_table = 'broadcast_notifications'
       AND n.related_id = bn.id
      INNER JOIN users u ON u.id = n.user_id
      LEFT JOIN classes c ON c.id = u.class_id
      WHERE bn.created_by = ?
        AND bn.status = 'sent'
      ORDER BY datetime(n.created_at) DESC, n.id DESC
      LIMIT 500
      `,
      [user.id]
    )) as any[]).map((row) => {
      const record: NotificationHistoryRecord = {
        id: toNumber(row.id),
        notification_id: toNumber(row.notification_id),
        notification_title: String(row.notification_title || ''),
        student_id: toNumber(row.student_id),
        student_name: String(row.student_name || ''),
        class_name: String(row.class_name || ''),
        sent_at: String(row.sent_at || ''),
        read_at: row.read_at ? String(row.read_at) : null,
        is_read: toBoolean(row.is_read),
        read_on_device: 'unknown',
      };

      return record;
    });

    const summary = {
      total_notifications: notifications.length,
      total_recipients: notifications.reduce(
        (sum, notification) => sum + notification.delivered_count,
        0
      ),
      total_read: notifications.reduce((sum, notification) => sum + notification.read_count, 0),
      total_unread: notifications.reduce((sum, notification) => sum + notification.unread_count, 0),
      low_read_notifications: notifications
        .filter((notification) => notification.delivered_count > 0)
        .sort((left, right) => left.read_rate - right.read_rate)
        .slice(0, 5),
    };

    return successResponse({ notifications, records, summary });
  } catch (error) {
    console.error('Lỗi lấy lịch sử thông báo:', error);
    return errorResponse(ApiError.internalError('Không thể lấy lịch sử thông báo'));
  }
}
