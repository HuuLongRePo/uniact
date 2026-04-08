import { NextRequest } from 'next/server';
import { dbGet, dbRun } from '@/lib/database';
import { requireRole } from '@/lib/guards';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    let user;
    try {
      user = await requireRole(request, ['teacher', 'admin']);
    } catch (err: any) {
      const msg = String(err?.message || '');
      return errorResponse(
        msg.includes('Chưa đăng nhập')
          ? ApiError.unauthorized('Chưa đăng nhập')
          : ApiError.forbidden('Không có quyền truy cập')
      );
    }

    const { id } = await params;
    const activityId = Number(id);
    if (!Number.isFinite(activityId)) {
      return errorResponse(ApiError.validation('ID hoạt động không hợp lệ'));
    }

    const body = await request.json().catch(() => ({}));
    const studentIds = Array.isArray(body?.student_ids)
      ? body.student_ids.map((x: any) => Number(x)).filter((x: any) => Number.isFinite(x))
      : [];

    if (studentIds.length === 0) {
      return errorResponse(ApiError.validation('student_ids (mảng) không hợp lệ'));
    }

    const activity = (await dbGet('SELECT id, teacher_id FROM activities WHERE id = ?', [
      activityId,
    ])) as any;
    if (!activity) return errorResponse(ApiError.notFound('Không tìm thấy hoạt động'));

    if (user.role === 'teacher' && activity.teacher_id !== user.id) {
      return errorResponse(ApiError.forbidden('Bạn chỉ có thể thao tác trên hoạt động của mình'));
    }

    const placeholders = studentIds.map(() => '?').join(',');
    const result = await dbRun(
      `DELETE FROM participations WHERE activity_id = ? AND student_id IN (${placeholders})`,
      [activityId, ...studentIds]
    );

    const removed = result?.changes || 0;
    return successResponse({ removed_count: removed }, `Đã xóa ${removed} học viên khỏi hoạt động`);
  } catch (error: any) {
    console.error('Bulk remove participants error:', error);
    return errorResponse(
      ApiError.internalError('Không thể xóa học viên khỏi hoạt động', error?.message)
    );
  }
}
