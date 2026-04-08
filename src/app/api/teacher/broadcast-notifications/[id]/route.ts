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

function toIntId(raw: string | undefined): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) throw ApiError.validation('ID không hợp lệ');
  return n;
}

async function getOwnedOrAdmin(user: { id: number; role: string }, id: number) {
  const row = await dbGet(
    `SELECT id, created_by, status, target_type, target_ids FROM broadcast_notifications WHERE id = ?`,
    [id]
  );

  if (!row) throw ApiError.notFound('Không tìm thấy thông báo');

  if (user.role !== 'admin' && Number(row.created_by) !== user.id) {
    throw ApiError.forbidden('Bạn không có quyền thao tác thông báo này');
  }

  return row;
}

// PUT /api/teacher/broadcast-notifications/:id
export async function PUT(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
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

    const current = await getOwnedOrAdmin(user, id);
    if (String(current.status) !== 'draft') {
      throw ApiError.forbidden('Chỉ có thể chỉnh sửa thông báo ở trạng thái nháp');
    }

    const body = await request.json();

    const title = String(body?.title || '').trim();
    const message = String(body?.message || '').trim();
    const targetType =
      (String(body?.target_type || current.target_type || 'all') as BroadcastTargetType) || 'all';
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

    await dbRun(
      `
      UPDATE broadcast_notifications
      SET title = ?, message = ?, target_type = ?, target_ids = ?, target_names = ?, scheduled_at = ?, status = ?, recipient_count = ?, updated_at = ?
      WHERE id = ?
      `,
      [
        title,
        message,
        targetType,
        JSON.stringify(targetType === 'all' ? classIds : targetIds),
        targetNames || null,
        scheduledAt,
        status,
        recipientIds.length,
        now,
        id,
      ]
    );

    return successResponse({ id }, 'Cập nhật thông báo thành công');
  } catch (error: any) {
    console.error('Teacher broadcast notifications update error:', error);
    return errorResponse(
      error instanceof ApiError
        ? error
        : ApiError.internalError('Không thể cập nhật thông báo', { details: error?.message })
    );
  }
}

// DELETE /api/teacher/broadcast-notifications/:id
export async function DELETE(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
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

    const current = await getOwnedOrAdmin(user, id);
    if (String(current.status) !== 'draft') {
      throw ApiError.forbidden('Chỉ có thể xóa thông báo ở trạng thái nháp');
    }

    await dbRun(`DELETE FROM broadcast_notifications WHERE id = ?`, [id]);

    return successResponse({ id }, 'Xóa thông báo thành công');
  } catch (error: any) {
    console.error('Teacher broadcast notifications delete error:', error);
    return errorResponse(
      error instanceof ApiError
        ? error
        : ApiError.internalError('Không thể xóa thông báo', { details: error?.message })
    );
  }
}
