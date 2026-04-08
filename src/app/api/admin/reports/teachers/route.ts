import { NextRequest } from 'next/server';
import { getUserFromSession } from '@/lib/auth';
import { dbAll } from '@/lib/database';
import { ApiError, successResponse, errorResponse } from '@/lib/api-response';

interface TeacherRow {
  id: number | string;
  name: string | null;
  email: string | null;
  totalActivitiesCreated: number | string | null;
  averageAttendance: number | string | null;
  averagePointsAwarded: number | string | null;
  totalStudentsParticipated: number | string | null;
}

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function GET(_request: NextRequest) {
  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'admin') {
      return errorResponse(
        ApiError.unauthorized('Bạn không có quyền truy cập báo cáo giảng viên.')
      );
    }

    const rows = (await dbAll(`
      SELECT 
        u.id,
        u.name,
        u.email,
        COUNT(DISTINCT a.id) as totalActivitiesCreated,
        CASE
          WHEN COUNT(p.id) = 0 THEN 0
          ELSE ROUND(100.0 * SUM(CASE WHEN p.attendance_status = 'attended' THEN 1 ELSE 0 END) / COUNT(p.id), 1)
        END as averageAttendance,
        COALESCE(ROUND(AVG(CASE WHEN p.attendance_status = 'attended' THEN COALESCE(pc.total_points, 0) END), 1), 0) as averagePointsAwarded,
        COUNT(DISTINCT CASE WHEN p.attendance_status = 'attended' THEN p.student_id END) as totalStudentsParticipated
      FROM users u
      LEFT JOIN activities a ON u.id = a.teacher_id
      LEFT JOIN participations p ON a.id = p.activity_id
      LEFT JOIN point_calculations pc ON pc.participation_id = p.id
      WHERE u.role = 'teacher' AND u.is_active = 1
      GROUP BY u.id, u.name, u.email
      ORDER BY totalActivitiesCreated DESC
    `)) as TeacherRow[];

    const teachers = rows.map((row) => ({
      id: toNumber(row.id),
      name: row.name ?? 'Chưa cập nhật',
      email: row.email ?? '',
      totalActivitiesCreated: toNumber(row.totalActivitiesCreated),
      averageAttendance: toNumber(row.averageAttendance),
      averagePointsAwarded: toNumber(row.averagePointsAwarded),
      totalStudentsParticipated: toNumber(row.totalStudentsParticipated),
    }));

    return successResponse({ teachers });
  } catch (error: unknown) {
    console.error('Get teacher performance error:', error);
    return errorResponse(
      ApiError.internalError(
        error instanceof Error ? error.message : 'Không thể tải báo cáo giảng viên.'
      )
    );
  }
}
