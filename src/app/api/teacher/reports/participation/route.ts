import { NextRequest } from 'next/server';
import { dbAll, dbReady } from '@/lib/database';
import { requireRole } from '@/lib/guards';
import { ApiError, successResponse, errorResponse } from '@/lib/api-response';
import { calculateParticipationRate } from '@/lib/calculations';

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

// GET /api/teacher/reports/participation
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
      return successResponse({ records: [], summary: [] });
    }

    const inClause = classIds.map(() => '?').join(',');

    const rows = await dbAll(
      `
      WITH score_by_activity AS (
        SELECT student_id, activity_id, SUM(points) as points
        FROM student_scores
        GROUP BY student_id, activity_id
      )
      SELECT
        a.id as activity_id,
        a.title as activity_name,
        u.id as student_id,
        u.name as student_name,
        u.student_code as student_code,
        c.name as class_name,
        COALESCE(at.name, '') as activity_type,
        date(a.date_time) as date,
        COALESCE(sba.points, 0) as score,
        CASE
          WHEN p.id IS NULL THEN 'not_participated'
          WHEN p.attendance_status = 'attended' THEN 'attended'
          ELSE 'participated'
        END as status
      FROM users u
      JOIN classes c ON c.id = u.class_id
      JOIN activity_classes ac ON ac.class_id = c.id
      JOIN activities a ON a.id = ac.activity_id
      LEFT JOIN activity_types at ON at.id = a.activity_type_id
      LEFT JOIN participations p ON p.activity_id = a.id AND p.student_id = u.id
      LEFT JOIN score_by_activity sba ON sba.activity_id = a.id AND sba.student_id = u.id
      WHERE u.role = 'student'
        AND u.class_id IN (${inClause})
        AND date(a.date_time) >= date('now', '-365 day')
      ORDER BY a.date_time DESC, u.name ASC
      `,
      classIds
    );

    const records = (rows as any[]).map((r) => ({
      activity_id: Number(r.activity_id),
      activity_name: String(r.activity_name || ''),
      student_id: Number(r.student_id),
      student_name: String(r.student_name || ''),
      class_name: String(r.class_name || ''),
      activity_type: String(r.activity_type || ''),
      date: String(r.date || ''),
      score: Number(r.score || 0),
      status: r.status as 'participated' | 'attended' | 'not_participated',
      _student_code: String(r.student_code || ''),
    }));

    // Build summary in JS to stay aligned with record semantics
    const byStudent = new Map<
      number,
      {
        student_id: number;
        student_name: string;
        student_code: string;
        class_name: string;
        total_activities: number;
        participated_count: number;
        total_score: number;
      }
    >();

    for (const rec of records as any[]) {
      const current = byStudent.get(rec.student_id) || {
        student_id: rec.student_id,
        student_name: rec.student_name,
        student_code: rec._student_code,
        class_name: rec.class_name,
        total_activities: 0,
        participated_count: 0,
        total_score: 0,
      };

      current.total_activities += 1;
      if (rec.status !== 'not_participated') current.participated_count += 1;
      current.total_score += Number(rec.score || 0);

      byStudent.set(rec.student_id, current);
    }

    const summary = Array.from(byStudent.values()).map((s) => {
      const rate = calculateParticipationRate(s.participated_count, s.total_activities);
      const avg = s.participated_count > 0 ? s.total_score / s.participated_count : 0;
      return {
        student_id: s.student_id,
        student_name: s.student_name,
        student_code: s.student_code,
        class_name: s.class_name,
        total_activities: s.total_activities,
        participated_count: s.participated_count,
        participation_rate: rate,
        total_score: Number(s.total_score.toFixed(2)),
        avg_score: Number(avg.toFixed(2)),
      };
    });

    // Strip helper field
    const cleanRecords = records.map(({ _student_code, ...rest }: any) => rest);

    return successResponse({ records: cleanRecords, summary });
  } catch (error: any) {
    console.error('Teacher participation report error:', error);
    return errorResponse(
      error instanceof ApiError
        ? error
        : ApiError.internalError('Không thể tải báo cáo', { details: error?.message })
    );
  }
}
