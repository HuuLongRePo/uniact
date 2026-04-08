import { NextRequest } from 'next/server';
import { dbAll, dbGet, dbReady, dbRun } from '@/lib/database';
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

async function computeRecipientsAndTargetNames(params: {
  user: { id: number; role: string };
  targetType: BroadcastTargetType;
  targetIds: number[];
}): Promise<{ classIds: number[]; recipientIds: number[]; targetNames: string }> {
  const accessibleClassIds = await getAccessibleClassIds(params.user);

  let classIds: number[];
  if (params.targetType === 'all') {
    classIds = accessibleClassIds;
  } else {
    classIds = params.targetIds.filter((id) => accessibleClassIds.includes(id));
  }

  if (classIds.length === 0) {
    return { classIds: [], recipientIds: [], targetNames: '' };
  }

  const placeholders = classIds.map(() => '?').join(',');
  const classRows = await dbAll(
    `SELECT id, name, grade FROM classes WHERE id IN (${placeholders}) ORDER BY name ASC`,
    classIds
  );

  let targetNames = '';
  if (params.targetType === 'all') {
    targetNames = params.user.role === 'admin' ? 'Tất cả học viên' : 'Tất cả lớp của tôi';
  } else if (params.targetType === 'grade') {
    const grades = Array.from(
      new Set((classRows as any[]).map((r) => String(r.grade || '')).filter(Boolean))
    );
    targetNames = grades.length ? `Khối: ${grades.join(', ')}` : '';
  } else {
    targetNames = (classRows as any[])
      .map((r) => String(r.name || ''))
      .filter(Boolean)
      .join(', ');
  }

  const studentRows = await dbAll(
    `SELECT id FROM users WHERE role = 'student' AND class_id IN (${placeholders})`,
    classIds
  );

  const recipientIds = Array.from(
    new Set((studentRows as any[]).map((r) => Number(r.id)).filter(Boolean))
  );

  return { classIds, recipientIds, targetNames };
}

// GET /api/teacher/broadcast-notifications?status=all|draft|scheduled|sent
export async function GET(request: NextRequest) {
  try {
    await dbReady();
    await ensureBroadcastTables();

    let user;
    try {
      user = await requireRole(request, ['teacher', 'admin']);
    } catch {
      return errorResponse(ApiError.unauthorized('Chưa đăng nhập'));
    }

    const { searchParams } = new URL(request.url);
    const statusFilter = (searchParams.get('status') || 'all').toLowerCase();

    const where: string[] = [];
    const params: any[] = [];

    if (user.role !== 'admin') {
      where.push('bn.created_by = ?');
      params.push(user.id);
    }

    if (statusFilter !== 'all' && ['draft', 'scheduled', 'sent'].includes(statusFilter)) {
      where.push('bn.status = ?');
      params.push(statusFilter);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const rows = await dbAll(
      `
      SELECT
        bn.id,
        bn.title,
        bn.message,
        bn.target_type,
        bn.target_ids,
        bn.target_names,
        bn.scheduled_at,
        bn.sent_at,
        bn.recipient_count,
        bn.status,
        bn.created_at,
        u.name as created_by
      FROM broadcast_notifications bn
      LEFT JOIN users u ON u.id = bn.created_by
      ${whereSql}
      ORDER BY bn.created_at DESC
      `,
      params
    );

    const notifications = (rows as any[]).map((r) => ({
      id: Number(r.id),
      title: String(r.title || ''),
      message: String(r.message || ''),
      target_type: (r.target_type as BroadcastTargetType) || 'all',
      target_ids: parseIdList(r.target_ids),
      target_names: r.target_names ? String(r.target_names) : undefined,
      scheduled_at: r.scheduled_at ? String(r.scheduled_at) : undefined,
      sent_at: r.sent_at ? String(r.sent_at) : undefined,
      recipient_count: Number(r.recipient_count || 0),
      status: (r.status as BroadcastStatus) || 'draft',
      created_at: String(r.created_at || ''),
      created_by: String(r.created_by || ''),
    }));

    return successResponse({ notifications });
  } catch (error: any) {
    console.error('Teacher broadcast notifications list error:', error);
    return errorResponse(
      error instanceof ApiError
        ? error
        : ApiError.internalError('Không thể tải thông báo', { details: error?.message })
    );
  }
}

// POST /api/teacher/broadcast-notifications
export async function POST(request: NextRequest) {
  try {
    await dbReady();
    await ensureBroadcastTables();

    let user;
    try {
      user = await requireRole(request, ['teacher', 'admin']);
    } catch {
      return errorResponse(ApiError.unauthorized('Chưa đăng nhập'));
    }

    const body = await request.json();

    const title = String(body?.title || '').trim();
    const message = String(body?.message || '').trim();
    const targetType = (String(body?.target_type || 'all') as BroadcastTargetType) || 'all';
    const targetIds = parseIdList(body?.target_ids);
    const scheduledAtRaw = String(body?.scheduled_at || '').trim();
    const scheduledAt = scheduledAtRaw ? scheduledAtRaw : null;

    if (!title) throw ApiError.validation('Vui lòng nhập tiêu đề');
    if (!message) throw ApiError.validation('Vui lòng nhập nội dung');
    if (!['all', 'class', 'grade'].includes(targetType))
      throw ApiError.validation('Đối tượng nhận không hợp lệ');
    if (targetType !== 'all' && targetIds.length === 0) {
      throw ApiError.validation('Vui lòng chọn đối tượng nhận thông báo');
    }

    const { classIds, recipientIds, targetNames } = await computeRecipientsAndTargetNames({
      user,
      targetType,
      targetIds,
    });

    if (targetType !== 'all' && classIds.length === 0) {
      throw ApiError.forbidden('Bạn không có quyền gửi tới các lớp đã chọn');
    }

    const status: BroadcastStatus = scheduledAt ? 'scheduled' : 'draft';

    const now = new Date().toISOString();
    const result = await dbRun(
      `
      INSERT INTO broadcast_notifications
        (title, message, target_type, target_ids, target_names, scheduled_at, recipient_count, status, created_by, created_at, updated_at)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        title,
        message,
        targetType,
        JSON.stringify(targetType === 'all' ? classIds : targetIds),
        targetNames || null,
        scheduledAt,
        recipientIds.length,
        status,
        user.id,
        now,
        now,
      ]
    );

    const created = await dbGet(`SELECT id FROM broadcast_notifications WHERE id = ?`, [
      result.lastID,
    ]);

    return successResponse(
      { id: Number(created?.id) },
      status === 'draft' ? 'Lưu nháp thành công' : 'Tạo thông báo thành công'
    );
  } catch (error: any) {
    console.error('Teacher broadcast notifications create error:', error);
    return errorResponse(
      error instanceof ApiError
        ? error
        : ApiError.internalError('Không thể tạo thông báo', { details: error?.message })
    );
  }
}
