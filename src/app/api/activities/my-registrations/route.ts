import { NextRequest } from 'next/server';
import { dbAll } from '@/lib/database';
import { requireApiRole } from '@/lib/guards';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

// GET /api/activities/my-registrations - Xem lịch sử đăng ký của tôi
export async function GET(request: NextRequest) {
  try {
    const user = await requireApiRole(request, ['student']);

    const registrations = await dbAll(
      `SELECT 
        p.id,
        p.activity_id,
        p.attendance_status,
        p.achievement_level,
        p.feedback,
        p.created_at as registered_at,
        a.title,
        a.description,
        a.date_time,
        a.location,
        a.status as activity_status,
        u.name as teacher_name,
        (SELECT COUNT(*) FROM participations WHERE activity_id = a.id AND attendance_status IN ('registered', 'attended')) as participant_count,
        a.max_participants
      FROM participations p
      JOIN activities a ON p.activity_id = a.id
      JOIN users u ON a.teacher_id = u.id
      WHERE p.student_id = ?
      ORDER BY a.date_time DESC`,
      [user.id]
    );

    // Phân loại registrations
    const now = new Date();
    const categorized = {
      upcoming: [] as any[],
      completed: [] as any[],
      cancelled: [] as any[],
    };

    registrations.forEach((reg: any) => {
      const activityDate = new Date(reg.date_time);

      if (reg.activity_status === 'cancelled') {
        categorized.cancelled.push(reg);
      } else if (activityDate > now && reg.attendance_status === 'registered') {
        categorized.upcoming.push(reg);
      } else {
        categorized.completed.push(reg);
      }
    });

    return successResponse({
      registrations: categorized,
      summary: {
        upcoming: categorized.upcoming.length,
        completed: categorized.completed.length,
        cancelled: categorized.cancelled.length,
      },
      total: registrations.length,
    });
  } catch (error: any) {
    console.error('Get my registrations error:', error);
    return errorResponse(
      error instanceof ApiError ? error : ApiError.internalError('Lỗi máy chủ nội bộ')
    );
  }
}
