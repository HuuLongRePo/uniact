import { NextRequest } from 'next/server';
import { dbAll, dbReady } from '@/lib/database';
import { requireApiRole } from '@/lib/guards';
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

function bucketScores(scores: number[]): Array<{ range: string; count: number }> {
  const buckets = [
    { min: 0, max: 50, label: '0-50' },
    { min: 51, max: 100, label: '51-100' },
    { min: 101, max: 200, label: '101-200' },
    { min: 201, max: Infinity, label: '201+' },
  ];

  return buckets.map((b) => ({
    range: b.label,
    count: scores.filter((s) => s >= b.min && s <= b.max).length,
  }));
}

export async function GET(request: NextRequest) {
  try {
    await dbReady();

    const user = await requireApiRole(request, ['teacher', 'admin']);

    const classIds = await getAccessibleClassIds(user);
    if (classIds.length === 0) {
      return successResponse({ stats: [] });
    }

    const inClause = classIds.map(() => '?').join(',');

    const base = await dbAll(
      `
      WITH student_points AS (
        SELECT u.class_id, u.id as student_id, COALESCE(SUM(ss.points), 0) as total_points
        FROM users u
        LEFT JOIN student_scores ss ON ss.student_id = u.id
        WHERE u.role = 'student' AND u.class_id IN (${inClause})
        GROUP BY u.class_id, u.id
      ),
      class_activities AS (
        SELECT ac.class_id, COUNT(DISTINCT a.id) as total_activities
        FROM activity_classes ac
        JOIN activities a ON a.id = ac.activity_id
        WHERE ac.class_id IN (${inClause})
          AND date(a.date_time) >= date('now', '-365 day')
        GROUP BY ac.class_id
      ),
      class_participations AS (
        SELECT u.class_id,
               SUM(CASE WHEN p.attendance_status = 'attended' THEN 1 ELSE 0 END) as attended_count,
               SUM(CASE WHEN p.attendance_status != 'attended' THEN 1 ELSE 0 END) as other_count
        FROM participations p
        JOIN users u ON u.id = p.student_id
        JOIN activity_classes ac ON ac.activity_id = p.activity_id AND ac.class_id = u.class_id
        WHERE u.role = 'student' AND u.class_id IN (${inClause})
        GROUP BY u.class_id
      )
      SELECT
        c.id as class_id,
        c.name as class_name,
        (SELECT COUNT(*) FROM users u WHERE u.role = 'student' AND u.class_id = c.id) as total_students,
        COALESCE(ca.total_activities, 0) as total_activities,
        COALESCE((SELECT SUM(sp.total_points) FROM student_points sp WHERE sp.class_id = c.id), 0) as total_points,
        COALESCE(cp.attended_count, 0) as attended_count
      FROM classes c
      LEFT JOIN class_activities ca ON ca.class_id = c.id
      LEFT JOIN class_participations cp ON cp.class_id = c.id
      WHERE c.id IN (${inClause})
      ORDER BY c.grade ASC, c.name ASC
      `,
      [...classIds, ...classIds, ...classIds, ...classIds]
    );

    const stats = [] as any[];

    for (const row of base as any[]) {
      const classId = Number(row.class_id);
      const totalStudents = Number(row.total_students || 0);
      const totalActivities = Number(row.total_activities || 0);
      const totalPoints = Number(row.total_points || 0);
      const attendedCount = Number(row.attended_count || 0);

      const denom = totalStudents * totalActivities;
      const participationRate = calculateAttendanceRate(attendedCount, denom);
      const avgScore = totalStudents > 0 ? totalPoints / totalStudents : 0;

      // Attendance trends (last 6 months)
      const trendRows = await dbAll(
        `
        SELECT
          strftime('%Y-%m', a.date_time) as month,
          COUNT(DISTINCT a.id) as activity_count,
          SUM(CASE WHEN p.attendance_status = 'attended' THEN 1 ELSE 0 END) as attended
        FROM activities a
        JOIN activity_classes ac ON ac.activity_id = a.id AND ac.class_id = ?
        LEFT JOIN participations p ON p.activity_id = a.id
        LEFT JOIN users u ON u.id = p.student_id AND u.class_id = ? AND u.role = 'student'
        WHERE date(a.date_time) >= date('now', '-180 day')
        GROUP BY month
        ORDER BY month ASC
        `,
        [classId, classId]
      );

      const attendance_trends = (trendRows as any[]).map((tr) => {
        const activityCount = Number(tr.activity_count || 0);
        const attended = Number(tr.attended || 0);
        const denomMonth = totalStudents * activityCount;
        return { month: String(tr.month), rate: calculateAttendanceRate(attended, denomMonth) };
      });

      // Score distribution (total points per student)
      const pointRows = await dbAll(
        `
        SELECT COALESCE(SUM(ss.points), 0) as total_points
        FROM users u
        LEFT JOIN student_scores ss ON ss.student_id = u.id
        WHERE u.role = 'student' AND u.class_id = ?
        GROUP BY u.id
        `,
        [classId]
      );
      const totals = (pointRows as any[]).map((p) => Number(p.total_points || 0));

      stats.push({
        class_id: classId,
        class_name: String(row.class_name || ''),
        total_students: totalStudents,
        total_activities: totalActivities,
        avg_participation_rate: participationRate,
        avg_score: Number(avgScore.toFixed(1)),
        total_points: Number(totalPoints.toFixed(1)),
        attendance_trends,
        score_distribution: bucketScores(totals),
      });
    }

    return successResponse({ stats });
  } catch (error: any) {
    console.error('Teacher class-stats report error:', error);
    return errorResponse(
      error instanceof ApiError ||
        (error && typeof error.status === 'number' && typeof error.code === 'string')
        ? error
        : ApiError.internalError('Không thể tải báo cáo', { details: error?.message })
    );
  }
}
