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
        msg.includes('quy')
          ? ApiError.forbidden('Không có quyền truy cập')
          : ApiError.unauthorized('Chưa xác thực')
      );
    }

    const { id } = await params;
    const activityId = Number(id);
    if (Number.isNaN(activityId)) {
      return errorResponse(ApiError.validation('ID hoạt động không hợp lệ'));
    }

    const activity = (await dbGet('SELECT id FROM activities WHERE id = ?', [activityId])) as
      | { id: number }
      | undefined;
    if (!activity) {
      return errorResponse(ApiError.notFound('Không tìm thấy hoạt động'));
    }

    if (user.role === 'teacher' && !(await teacherCanAccessActivity(Number(user.id), activityId))) {
      return errorResponse(ApiError.forbidden('Bạn chỉ có thể xem người tham gia của hoạt động thuộc phạm vi quản lý'));
    }

    const participations = (await dbAll(
      `
      SELECT
        p.id,
        p.student_id,
        u.name as full_name,
        u.name as student_name,
        u.email as email,
        u.email as student_email,
        COALESCE(u.student_code, u.code, u.username, CAST(u.id AS TEXT)) as student_code,
        COALESCE(c.name, '') as class_name,
        p.attendance_status,
        p.achievement_level,
        p.evaluated_at,
        p.evaluated_by,
        ss.points
      FROM participations p
      JOIN users u ON u.id = p.student_id
      LEFT JOIN classes c ON c.id = u.class_id
      LEFT JOIN student_scores ss ON ss.activity_id = p.activity_id AND ss.student_id = p.student_id
      WHERE p.activity_id = ?
      ORDER BY
        CASE p.attendance_status
          WHEN 'attended' THEN 1
          WHEN 'registered' THEN 2
          WHEN 'absent' THEN 3
        END,
        u.name ASC
      `,
      [activityId]
    )) as Array<{
      id: number;
      student_id: number;
      full_name?: string;
      student_name: string;
      student_email: string;
      attendance_status: 'registered' | 'attended' | 'absent';
      achievement_level?: 'excellent' | 'good' | 'participated' | null;
      evaluated_at?: string;
      evaluated_by?: number;
      points?: number;
    }>;

    return successResponse({ participations, total: participations.length });
  } catch (error: any) {
    console.error('Error fetching participants:', error);
    return errorResponse(
      ApiError.internalError('Could not load activity participants', error?.message)
    );
  }
}
