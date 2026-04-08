import { NextRequest } from 'next/server';
import { dbAll, dbGet, dbRun, withTransaction } from '@/lib/database';
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
    const classId = Number(body?.class_id);
    if (!Number.isFinite(classId)) {
      return errorResponse(ApiError.validation('class_id không hợp lệ'));
    }

    const activity = (await dbGet('SELECT id, teacher_id, title FROM activities WHERE id = ?', [
      activityId,
    ])) as any;
    if (!activity) return errorResponse(ApiError.notFound('Không tìm thấy hoạt động'));

    if (user.role === 'teacher' && activity.teacher_id !== user.id) {
      return errorResponse(ApiError.forbidden('Bạn chỉ có thể thao tác trên hoạt động của mình'));
    }

    const students = (await dbAll(
      `SELECT id FROM users WHERE role = 'student' AND is_active = 1 AND class_id = ?`,
      [classId]
    )) as Array<{ id: number }>;

    if (!students || students.length === 0) {
      return successResponse({ added_count: 0 }, 'Lớp này chưa có học viên');
    }

    let addedCount = 0;

    await withTransaction(async () => {
      for (const s of students) {
        const result = await dbRun(
          `INSERT OR IGNORE INTO participations (activity_id, student_id, attendance_status)
           VALUES (?, ?, 'registered')`,
          [activityId, s.id]
        );
        if (result?.changes) addedCount += result.changes;
      }
    });

    return successResponse(
      { added_count: addedCount },
      `Đã thêm ${addedCount} học viên vào hoạt động`
    );
  } catch (error: any) {
    console.error('Add class to participants error:', error);
    return errorResponse(
      ApiError.internalError('Không thể thêm học viên theo lớp', error?.message)
    );
  }
}
