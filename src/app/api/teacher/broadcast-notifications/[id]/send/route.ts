import { NextRequest } from 'next/server';
import { dbAll, dbGet, dbReady, dbRun, withTransaction } from '@/lib/database';
import { requireRole } from '@/lib/guards';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

type BroadcastTargetType = 'all' | 'class' | 'grade';

type BroadcastStatus = 'draft' | 'scheduled' | 'sent';

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

async function getAccessibleClassIds(user: { id: number; role: string }): Promise<number[]> {
  if (user.role === 'admin') {
    const rows = await dbAll(`SELECT id FROM classes ORDER BY id`);
    return (rows as any[]).map((r) => Number(r.id)).filter(Boolean);
  }

  const rows = await dbAll(
    `
    SELECT DISTINCT c.id
    FROM classes c
    LEFT JOIN class_teachers ct ON ct.class_id = c.id
    WHERE c.teacher_id = ? OR ct.teacher_id = ?
    `,
    [user.id, user.id]
  );

  return (rows as any[]).map((r) => Number(r.id)).filter(Boolean);
}

function parseIdList(raw: unknown): number[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map((v) => Number(v)).filter((n) => Number.isFinite(n));
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed))
        return parsed.map((v) => Number(v)).filter((n) => Number.isFinite(n));
    } catch {}
  }
  return [];
}

async function computeRecipients(params: {
  user: { id: number; role: string };
  targetType: BroadcastTargetType;
  targetIds: number[];
}): Promise<number[]> {
  const accessibleClassIds = await getAccessibleClassIds(params.user);

  let classIds: number[];
  if (params.targetType === 'all') {
    classIds = accessibleClassIds;
  } else {
    classIds = params.targetIds.filter((id) => accessibleClassIds.includes(id));
  }

  if (classIds.length === 0) return [];

  const placeholders = classIds.map(() => '?').join(',');
  const rows = await dbAll(
    `SELECT id FROM users WHERE role = 'student' AND class_id IN (${placeholders})`,
    classIds
  );

  return Array.from(new Set((rows as any[]).map((r) => Number(r.id)).filter(Boolean)));
}

function toIntId(raw: string | undefined): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) throw ApiError.validation('ID không hợp lệ');
  return n;
}

// POST /api/teacher/broadcast-notifications/:id/send
export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await dbReady();
    await ensureBroadcastTables();

    let user;
    try {
      user = await requireRole(request, ['teacher', 'admin']);
    } catch {
      return errorResponse(ApiError.unauthorized('Chưa đăng nhập'));
    }

    const { id: idRaw } = await ctx.params;
    const id = toIntId(idRaw);

    const bn = await dbGet(
      `SELECT id, title, message, target_type, target_ids, status, created_by FROM broadcast_notifications WHERE id = ?`,
      [id]
    );

    if (!bn) throw ApiError.notFound('Không tìm thấy thông báo');
    if (user.role !== 'admin' && Number(bn.created_by) !== user.id) {
      throw ApiError.forbidden('Bạn không có quyền gửi thông báo này');
    }

    const status = String(bn.status || 'draft') as BroadcastStatus;
    if (status === 'sent') {
      return successResponse(
        { id, count: Number(bn.recipient_count || 0) },
        'Thông báo đã được gửi trước đó'
      );
    }

    const targetType = (String(bn.target_type || 'all') as BroadcastTargetType) || 'all';
    const targetIds = parseIdList(bn.target_ids);

    const recipientIds = await computeRecipients({ user, targetType, targetIds });
    if (recipientIds.length === 0) {
      throw ApiError.notFound('Không có học viên nào để gửi thông báo');
    }

    const now = new Date().toISOString();

    await withTransaction(async () => {
      for (const studentId of recipientIds) {
        await dbRun(
          `
          INSERT INTO notifications (user_id, type, title, message, related_table, related_id, is_read, created_at)
          VALUES (?, ?, ?, ?, ?, ?, 0, ?)
          `,
          [
            studentId,
            'broadcast',
            String(bn.title || ''),
            String(bn.message || ''),
            'broadcast_notifications',
            id,
            now,
          ]
        );
      }

      await dbRun(
        `
        UPDATE broadcast_notifications
        SET status = 'sent', sent_at = ?, recipient_count = ?, updated_at = ?
        WHERE id = ?
        `,
        [now, recipientIds.length, now, id]
      );

      try {
        await dbRun(
          `
          INSERT INTO audit_logs (actor_id, action, target_table, target_id, details, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
          `,
          [
            user.id,
            'broadcast_notification_send',
            'broadcast_notifications',
            id,
            `Broadcast to ${recipientIds.length} students: ${String(bn.title || '')}`,
            now,
          ]
        );
      } catch (e) {
        console.error('Audit log error:', e);
      }
    });

    const updated = await dbGet(
      `SELECT recipient_count FROM broadcast_notifications WHERE id = ?`,
      [id]
    );

    return successResponse(
      { id, count: Number(updated?.recipient_count || recipientIds.length) },
      'Gửi thông báo thành công'
    );
  } catch (error: any) {
    console.error('Teacher broadcast notifications send error:', error);
    return errorResponse(
      error instanceof ApiError
        ? error
        : ApiError.internalError('Không thể gửi thông báo', { details: error?.message })
    );
  }
}
