import { NextRequest } from 'next/server';
import { dbAll, dbGet } from '@/lib/database';
import { requireRole } from '@/lib/guards';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import { teacherCanAccessActivity } from '@/lib/activity-access';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const activity = (await dbGet('SELECT id, teacher_id FROM activities WHERE id = ?', [
      activityId,
    ])) as any;
    if (!activity) return errorResponse(ApiError.notFound('Không tìm thấy hoạt động'));

    if (
      user.role === 'teacher' &&
      !(await teacherCanAccessActivity(Number(user.id), Number(activityId)))
    ) {
      return errorResponse(ApiError.forbidden('Bạn chỉ có thể xem học viên của hoạt động thuộc phạm vi quản lý'));
    }

    const classIds = (await dbAll('SELECT class_id FROM activity_classes WHERE activity_id = ?', [
      activityId,
    ])) as Array<{ class_id: number }>;

    let students: any[] = [];

    if (classIds && classIds.length > 0) {
      const placeholders = classIds.map(() => '?').join(',');
      students = (await dbAll(
        `SELECT 
          u.id,
          COALESCE(u.full_name, u.name) as name,
          COALESCE(u.student_code, u.code, u.username, u.student_id) as student_code
        FROM users u
        WHERE u.role = 'student'
          AND u.is_active = 1
          AND u.class_id IN (${placeholders})
        ORDER BY COALESCE(u.full_name, u.name)`,
        classIds.map((c) => c.class_id)
      )) as any[];
    } else {
      // Fallback: students already in participations
      students = (await dbAll(
        `SELECT DISTINCT
          u.id,
          COALESCE(u.full_name, u.name) as name,
          COALESCE(u.student_code, u.code, u.username, u.student_id) as student_code
        FROM participations p
        JOIN users u ON u.id = p.student_id
        WHERE p.activity_id = ?
        ORDER BY COALESCE(u.full_name, u.name)`,
        [activityId]
      )) as any[];
    }

    return successResponse({ students });
  } catch (error: any) {
    console.error('Get activity students error:', error);
    return errorResponse(
      ApiError.internalError('Không thể tải danh sách học viên', error?.message)
    );
  }
}
