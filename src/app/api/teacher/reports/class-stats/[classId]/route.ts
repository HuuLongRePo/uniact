import { NextRequest } from 'next/server';
import { dbAll, dbGet, dbReady } from '@/lib/database';
import { requireRole } from '@/lib/guards';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import { calculateAttendanceRate } from '@/lib/calculations';

async function assertCanAccessClass(
  user: { id: number; role: string },
  classId: number
): Promise<void> {
  if (user.role === 'admin') return;

  const row = await dbGet(
    `
    SELECT c.id
    FROM classes c
    LEFT JOIN class_teachers ct ON ct.class_id = c.id AND ct.teacher_id = ?
    WHERE c.id = ? AND (c.teacher_id = ? OR ct.teacher_id IS NOT NULL)
    `,
    [user.id, classId, user.id]
  );

  if (!row) throw ApiError.forbidden('Bạn không có quyền xem lớp này');
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    await dbReady();
    const { classId } = await params;

    let user;
    try {
      user = await requireRole(request, ['teacher', 'admin']);
    } catch {
      return errorResponse(ApiError.unauthorized('Chưa đăng nhập'));
    }

    const cid = Number(classId);
    if (!cid || Number.isNaN(cid)) {
      return errorResponse(ApiError.validation('ID lớp học không hợp lệ'));
    }

    await assertCanAccessClass(user, cid);

    const classRow = (await dbGet(`SELECT id, name FROM classes WHERE id = ?`, [cid])) as any;
    if (!classRow) {
      return errorResponse(ApiError.notFound('Không tìm thấy lớp'));
    }

    const totalActivitiesRow = (await dbGet(
      `
      SELECT COUNT(DISTINCT a.id) as total
      FROM activity_classes ac
      JOIN activities a ON a.id = ac.activity_id
      WHERE ac.class_id = ? AND date(a.date_time) >= date('now', '-365 day')
      `,
      [cid]
    )) as any;

    const totalActivities = Number(totalActivitiesRow?.total || 0);

    const students = await dbAll(
      `
      WITH class_acts AS (
        SELECT DISTINCT a.id
        FROM activity_classes ac
        JOIN activities a ON a.id = ac.activity_id
        WHERE ac.class_id = ? AND date(a.date_time) >= date('now', '-365 day')
      ),
      score_by_activity AS (
        SELECT student_id, activity_id, SUM(points) as points
        FROM student_scores
        GROUP BY student_id, activity_id
      )
      SELECT
        u.name as student_name,
        u.student_code as student_code,
        SUM(CASE WHEN p.id IS NULL THEN 0 ELSE 1 END) as participation_count,
        SUM(COALESCE(sba.points, 0)) as total_score
      FROM users u
      CROSS JOIN class_acts ca
      LEFT JOIN participations p ON p.activity_id = ca.id AND p.student_id = u.id
      LEFT JOIN score_by_activity sba ON sba.activity_id = ca.id AND sba.student_id = u.id
      WHERE u.role = 'student' AND u.class_id = ?
      GROUP BY u.id, u.name, u.student_code
      ORDER BY u.name ASC
      `,
      [cid, cid]
    );

    const normalized = (students as any[]).map((s) => {
      const count = Number(s.participation_count || 0);
      const total = Number(s.total_score || 0);
      const rate = calculateAttendanceRate(count, totalActivities);
      const avg = count > 0 ? total / count : 0;
      return {
        student_name: String(s.student_name || ''),
        student_code: String(s.student_code || ''),
        participation_count: count,
        participation_rate: rate,
        avg_score: Number(avg.toFixed(2)),
      };
    });

    return successResponse({
      class_name: String(classRow.name || ''),
      students: normalized,
    });
  } catch (error: any) {
    console.error('Teacher class stats detail error:', error);
    return errorResponse(
      error instanceof ApiError
        ? error
        : ApiError.internalError('Không thể tải chi tiết lớp', { details: error?.message })
    );
  }
}
