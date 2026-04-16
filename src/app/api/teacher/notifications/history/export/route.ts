import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { dbAll, dbReady, dbRun } from '@/lib/database';
import { ApiError, errorResponse } from '@/lib/api-response';

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

function toCsvValue(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

export async function POST(request: NextRequest) {
  try {
    await dbReady();
    await ensureBroadcastTables();

    const token = request.cookies.get('token')?.value;
    if (!token) return errorResponse(ApiError.unauthorized('Chưa đăng nhập'));

    const user = await getUserFromToken(token);
    if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
      return errorResponse(ApiError.forbidden('Không có quyền truy cập'));
    }

    const body = await request.json().catch(() => ({}));
    const filters = body?.filters || {};

    const rows = (await dbAll(
      `
      SELECT
        n.id,
        bn.id as notification_id,
        bn.title as notification_title,
        u.name as student_name,
        c.name as class_name,
        n.created_at as sent_at,
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
    )) as any[];

    const normalizedRows = rows.filter((row) => {
      if (filters.readStatus === 'read' && !Number(row.is_read)) return false;
      if (filters.readStatus === 'unread' && Number(row.is_read)) return false;
      if (filters.classId && String(row.class_name || '') !== String(filters.classId)) return false;
      if (
        filters.dateStart &&
        new Date(String(row.sent_at || '')) < new Date(String(filters.dateStart))
      ) {
        return false;
      }
      if (
        filters.dateEnd &&
        new Date(String(row.sent_at || '')) > new Date(String(filters.dateEnd))
      ) {
        return false;
      }
      return true;
    });

    const rowsForCsv = [
      ['Học viên', 'Lớp', 'Thông báo', 'Gửi lúc', 'Trạng thái đọc', 'Thiết bị'],
      ...normalizedRows.map((row) => [
        String(row.student_name || ''),
        String(row.class_name || ''),
        String(row.notification_title || ''),
        row.sent_at ? new Date(String(row.sent_at)).toLocaleString('vi-VN') : '',
        Number(row.is_read) ? 'Đã đọc' : 'Chưa đọc',
        'Không theo dõi',
      ]),
    ];

    const csv = `\uFEFF${rowsForCsv
      .map((row) => row.map((value) => toCsvValue(value)).join(','))
      .join('\n')}`;

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="notification-history-${Date.now()}.csv"`,
      },
    });
  } catch (error) {
    console.error('Lỗi export lịch sử thông báo:', error);
    return errorResponse(ApiError.internalError('Không thể xuất lịch sử thông báo'));
  }
}
