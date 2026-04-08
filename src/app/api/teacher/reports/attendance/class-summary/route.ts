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

    const summary: any[] = [];

    for (const classId of classIds) {
      const cls = (await dbGet(`SELECT id, name FROM classes WHERE id = ?`, [classId])) as any;
      if (!cls) continue;

      const totalStudentsRow = (await dbGet(
        `SELECT COUNT(*) as total FROM users WHERE role='student' AND class_id = ?`,
        [classId]
      )) as any;
      const totalStudents = Number(totalStudentsRow?.total || 0);

      const totalActivitiesRow = (await dbGet(
        `
        SELECT COUNT(DISTINCT a.id) as total
        FROM activity_classes ac
        JOIN activities a ON a.id = ac.activity_id
        WHERE ac.class_id = ? AND date(a.date_time) >= date('now', '-365 day')
        `,
        [classId]
      )) as any;
      const totalActivities = Number(totalActivitiesRow?.total || 0);

      const counts = (await dbGet(
        `
        SELECT
          SUM(CASE WHEN p.attendance_status = 'attended' THEN 1 ELSE 0 END) as present_count,
          SUM(CASE WHEN p.attendance_status = 'absent' THEN 1 ELSE 0 END) as absent_count,
          SUM(CASE WHEN p.attendance_status = 'registered' THEN 1 ELSE 0 END) as not_participated_count
        FROM participations p
        JOIN users u ON u.id = p.student_id
        JOIN activities a ON a.id = p.activity_id
        JOIN activity_classes ac ON ac.activity_id = p.activity_id AND ac.class_id = u.class_id
        WHERE u.role='student' AND u.class_id = ?
          AND date(a.date_time) >= date('now', '-365 day')
        `,
        [classId]
      )) as any;

      const present = Number(counts?.present_count || 0);
      const absent = Number(counts?.absent_count || 0);
      const notParticipated = Number(counts?.not_participated_count || 0);
      const late = 0;
      const totalAttendance = present + absent + notParticipated + late;

      const denom = totalStudents * totalActivities;
      const presentRate = calculateAttendanceRate(present, denom);
      const absentRate = calculateAttendanceRate(absent, denom);
      const lateRate = 0;

      summary.push({
        class_id: Number(cls.id),
        class_name: String(cls.name || ''),
        total_students: totalStudents,
        total_activities: totalActivities,
        total_attendance: totalAttendance,
        present_count: present,
        absent_count: absent,
        late_count: late,
        excused_count: 0,
        not_participated_count: notParticipated,
        present_rate: presentRate,
        absent_rate: absentRate,
        late_rate: lateRate,
      });
    }

    return successResponse({ summary });
  } catch (error: any) {
    console.error('Teacher attendance class summary error:', error);
    return errorResponse(
      error instanceof ApiError
        ? error
        : ApiError.internalError('Không thể tải báo cáo', { details: error?.message })
    );
  }
}
