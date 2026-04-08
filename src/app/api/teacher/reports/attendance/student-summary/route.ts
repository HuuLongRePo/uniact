import { NextRequest } from 'next/server';
import { dbAll, dbGet, dbReady } from '@/lib/database';
import { requireRole } from '@/lib/guards';
import { ApiError, successResponse, errorResponse } from '@/lib/api-response';
import { calculateAttendanceRate } from '@/lib/calculations';

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

export async function GET(request: NextRequest) {
  try {
    await dbReady();

    let user;
    try {
      user = await requireRole(request, ['teacher', 'admin']);
    } catch {
      return errorResponse(ApiError.unauthorized('Chưa đăng nhập'));
    }

    const classIds = await getAccessibleClassIds(user);
    if (classIds.length === 0) {
      return successResponse({ summary: [] });
    }

    const inClause = classIds.map(() => '?').join(',');

    const totalActivitiesByClass = new Map<number, number>();
    const activityCounts = await dbAll(
      `
      SELECT ac.class_id, COUNT(DISTINCT a.id) as total
      FROM activity_classes ac
      JOIN activities a ON a.id = ac.activity_id
      WHERE ac.class_id IN (${inClause})
        AND date(a.date_time) >= date('now', '-365 day')
      GROUP BY ac.class_id
      `,
      classIds
    );
    for (const r of activityCounts as any[]) {
      totalActivitiesByClass.set(Number(r.class_id), Number(r.total || 0));
    }

    const rows = await dbAll(
      `
      SELECT
        u.id as student_id,
        u.name as student_name,
        u.student_code as student_code,
        c.name as class_name,
        u.class_id as class_id,
        SUM(CASE WHEN p.attendance_status = 'attended' THEN 1 ELSE 0 END) as present_count,
        SUM(CASE WHEN p.attendance_status = 'absent' THEN 1 ELSE 0 END) as absent_count,
        SUM(CASE WHEN p.attendance_status = 'registered' THEN 1 ELSE 0 END) as not_participated_count
      FROM users u
      JOIN classes c ON c.id = u.class_id
      LEFT JOIN participations p ON p.student_id = u.id
      LEFT JOIN activities a ON a.id = p.activity_id
      LEFT JOIN activity_classes ac ON ac.activity_id = p.activity_id AND ac.class_id = u.class_id
      WHERE u.role = 'student'
        AND u.class_id IN (${inClause})
        AND (a.id IS NULL OR date(a.date_time) >= date('now', '-365 day'))
      GROUP BY u.id, u.name, u.student_code, c.name, u.class_id
      ORDER BY c.name ASC, u.name ASC
      `,
      classIds
    );

    const summary = (rows as any[]).map((r) => {
      const classId = Number(r.class_id);
      const totalActivities = totalActivitiesByClass.get(classId) || 0;
      const present = Number(r.present_count || 0);
      const absent = Number(r.absent_count || 0);
      const notParticipated = Number(r.not_participated_count || 0);
      const late = 0;

      const attendanceRate = calculateAttendanceRate(present, totalActivities);

      return {
        student_id: Number(r.student_id),
        student_name: String(r.student_name || ''),
        student_code: String(r.student_code || ''),
        class_name: String(r.class_name || ''),
        total_activities: totalActivities,
        present_count: present,
        absent_count: absent,
        late_count: late,
        excused_count: 0,
        not_participated_count: notParticipated,
        attendance_rate: attendanceRate,
      };
    });

    return successResponse({ summary });
  } catch (error: any) {
    console.error('Teacher attendance student summary error:', error);
    return errorResponse(
      error instanceof ApiError
        ? error
        : ApiError.internalError('Không thể tải báo cáo', { details: error?.message })
    );
  }
}
