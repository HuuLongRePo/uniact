import { NextRequest } from 'next/server';
import { requireRole } from '@/lib/guards';
import { dbHelpers, dbAll, dbRun } from '@/lib/database';
import { cache } from '@/lib/cache';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

// POST /api/activities/:id/clone - Tạo bản sao hoạt động (status=draft)
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    let user;
    try {
      user = await requireRole(request, ['teacher', 'admin']);
    } catch (err: any) {
      const message = String(err?.message || '');
      return errorResponse(
        message.includes('Không có quyền')
          ? ApiError.forbidden('Không có quyền truy cập')
          : ApiError.unauthorized('Chưa đăng nhập')
      );
    }

    const { id } = await params;
    const sourceId = Number(id);
    if (!sourceId || Number.isNaN(sourceId))
      return errorResponse(ApiError.validation('ID hoạt động không hợp lệ'));

    const original = await dbHelpers.getActivityById(sourceId);
    if (!original) return errorResponse(ApiError.notFound('Không tìm thấy hoạt động'));

    // Teacher chỉ clone hoạt động của mình
    if (user.role === 'teacher' && Number(original.teacher_id) !== Number(user.id)) {
      return errorResponse(ApiError.forbidden('Bạn không phải người tạo hoạt động này'));
    }

    // Chuẩn bị dữ liệu bản sao
    const newTitle = `${original.title} (Bản sao)`;
    const now = new Date().toISOString();

    const result = await dbRun(
      `INSERT INTO activities (
        title, description, date_time, location, teacher_id, max_participants,
        activity_type_id, organization_level, base_points, approval_status, status,
        created_at, registration_deadline, end_time, organization_level_id, approved_by,
        approved_at, approval_notes, updated_at, submitted_at, submitted_by, rejected_reason
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', 'draft', ?, ?, ?, ?, NULL, NULL, NULL, ?, NULL, NULL, NULL)`,
      [
        newTitle,
        original.description,
        original.date_time,
        original.location,
        user.role === 'admin' ? original.teacher_id : user.id, // Admin giữ nguyên teacher gốc
        original.max_participants,
        original.activity_type_id,
        original.organization_level,
        original.base_points,
        now,
        original.registration_deadline,
        original.end_time,
        original.organization_level_id,
        now,
      ]
    );

    // Sao chép mapping lớp từ bảng activity_classes
    try {
      const classRows = (await dbAll(
        'SELECT class_id FROM activity_classes WHERE activity_id = ?',
        [sourceId]
      )) as Array<{ class_id: number }>;

      for (const row of classRows) {
        await dbRun(
          'INSERT OR IGNORE INTO activity_classes (activity_id, class_id) VALUES (?, ?)',
          [result.lastID, row.class_id]
        );
      }
    } catch (mappingError) {
      console.error('Clone activity mapping error:', mappingError);
    }

    // Audit log
    try {
      await dbRun(
        'INSERT INTO audit_logs (actor_id, action, target_table, target_id, details) VALUES (?, ?, ?, ?, ?)',
        [user.id, 'clone_activity', 'activities', result.lastID, JSON.stringify({ from: sourceId })]
      );
    } catch {}

    cache.invalidatePrefix('activities:');

    return successResponse({ new_activity_id: result.lastID }, 'Đã tạo bản sao hoạt động');
  } catch (error: any) {
    console.error('Clone activity error:', error);
    return errorResponse(ApiError.internalError('Lỗi máy chủ nội bộ'));
  }
}
