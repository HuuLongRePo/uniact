import { NextRequest } from 'next/server';
import { dbAll, dbGet, dbReady } from '@/lib/database';
import { requireRole } from '@/lib/guards';
import { ApiError, successResponseWithExtra, errorResponse } from '@/lib/api-response';

// GET /api/teacher/activities/[id]/participants - Get activity participants
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await dbReady();

    let user;
    try {
      user = await requireRole(request, ['teacher', 'admin']);
    } catch {
      return errorResponse(ApiError.unauthorized('Chưa đăng nhập'));
    }

    const activityId = Number(id);
    if (!activityId || Number.isNaN(activityId)) {
      return errorResponse(ApiError.validation('ID hoạt động không hợp lệ'));
    }

    // Verify teacher owns this activity
    const activity = (await dbGet('SELECT id, teacher_id FROM activities WHERE id = ?', [
      activityId,
    ])) as any;

    if (!activity) {
      return errorResponse(ApiError.notFound('Không tìm thấy hoạt động'));
    }

    if (user.role === 'teacher' && Number(activity.teacher_id) !== Number(user.id)) {
      return errorResponse(
        ApiError.forbidden('Bạn chỉ có thể xem người tham gia của hoạt động do bạn tổ chức')
      );
    }

    // Get participants
    const participantRows = await dbAll(
      `
      SELECT
        p.id as participation_id,
        p.attendance_status,
        p.achievement_level,
        p.feedback,
        u.id as student_id,
        u.name as student_name,
        u.student_code as student_code,
        c.name as class_name
      FROM participations p
      JOIN users u ON p.student_id = u.id
      LEFT JOIN classes c ON u.class_id = c.id
      WHERE p.activity_id = ?
      ORDER BY u.name ASC
      `,
      [activityId]
    );

    const participants = (participantRows as any[]).map((r) => ({
      id: Number(r.participation_id),
      student_id: Number(r.student_id),
      student_name: String(r.student_name || ''),
      student_code: String(r.student_code || ''),
      class_name: String(r.class_name || ''),
      attended: String(r.attendance_status || '') === 'attended' ? 1 : 0,
      achievement_level: r.achievement_level ? String(r.achievement_level) : null,
      feedback: r.feedback ? String(r.feedback) : null,
    }));

    // Get summary
    const summary = (await dbGet(
      `
      SELECT 
        COUNT(*) as total_participants,
        COUNT(CASE WHEN attendance_status = 'registered' THEN 1 END) as registered_count,
        COUNT(CASE WHEN attendance_status = 'attended' THEN 1 END) as attended_count,
        COUNT(CASE WHEN achievement_level IS NOT NULL THEN 1 END) as evaluated_count,
        COUNT(CASE WHEN achievement_level = 'excellent' THEN 1 END) as excellent_count,
        COUNT(CASE WHEN achievement_level = 'good' THEN 1 END) as good_count
      FROM participations
      WHERE activity_id = ?
    `,
      [activityId]
    )) as any;

    return successResponseWithExtra(participants, {
      summary: summary || {
        total_participants: 0,
        registered_count: 0,
        attended_count: 0,
        evaluated_count: 0,
        excellent_count: 0,
        good_count: 0,
      },
    });
  } catch (error: any) {
    console.error('Lỗi lấy danh sách người tham gia:', error);
    return errorResponse(
      ApiError.internalError('Không thể lấy danh sách người tham gia', { details: error?.message })
    );
  }
}
