import { NextRequest } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { dbAll, dbGet } from '@/lib/database';
import { ApiError, successResponse, errorResponse } from '@/lib/api-response';

// GET /api/reports/dashboard - aggregated stats
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return errorResponse(ApiError.unauthorized('Chưa đăng nhập'));
    const user = await getUserFromToken(token);
    if (!user || user.role !== 'admin') {
      return errorResponse(ApiError.forbidden('Không có quyền truy cập'));
    }

    // Activities per month (last 6 months)
    const activitiesByMonth = await dbAll(`
      SELECT strftime('%Y-%m', date_time) as month, COUNT(*) as total
      FROM activities
      WHERE date_time >= date('now', '-6 months')
        AND status IN ('published', 'completed')
      GROUP BY strftime('%Y-%m', date_time)
      ORDER BY month ASC
    `);

    // Total students
    const totalStudentsRow = await dbGet(
      `SELECT COUNT(*) as total FROM users WHERE role = 'student'`
    );
    const totalActivitiesRow = await dbGet(
      `SELECT COUNT(*) as total FROM activities WHERE status = 'published' OR status = 'completed'`
    );

    // Top 10 students by total score
    const topStudents = await dbAll(`
      SELECT u.id, u.name, u.email, COALESCE(SUM(ss.points),0) as total_points
      FROM users u
      LEFT JOIN student_scores ss ON u.id = ss.student_id
      WHERE u.role = 'student'
      GROUP BY u.id
      ORDER BY total_points DESC
      LIMIT 10
    `);

    // Participation rate by class (published/completed activities with participations)
    const participationByClass = await dbAll(`
      SELECT c.id, c.name,
        COUNT(DISTINCT CASE WHEN a.id IS NOT NULL THEN p.activity_id END) as activities_participated,
        COUNT(DISTINCT CASE WHEN a.id IS NOT NULL THEN p.student_id END) as distinct_students
      FROM classes c
      LEFT JOIN users u ON u.class_id = c.id AND u.role = 'student'
      LEFT JOIN participations p ON p.student_id = u.id
      LEFT JOIN activities a ON a.id = p.activity_id AND a.status IN ('published', 'completed')
      GROUP BY c.id
      ORDER BY activities_participated DESC
      LIMIT 10
    `);

    // Most popular activities (by participant count)
    const popularActivities = await dbAll(`
      SELECT a.id, a.title,
        COUNT(p.id) as participant_count
      FROM activities a
      LEFT JOIN participations p ON p.activity_id = a.id
      WHERE a.status IN ('published','completed')
      GROUP BY a.id
      ORDER BY participant_count DESC
      LIMIT 10
    `);

    return successResponse({
      stats: {
        total_students: totalStudentsRow?.total || 0,
        total_activities: totalActivitiesRow?.total || 0,
      },
      activities_by_month: activitiesByMonth,
      top_students: topStudents,
      participation_by_class: participationByClass,
      popular_activities: popularActivities,
    });
  } catch (e: any) {
    console.error('Dashboard report error:', e);
    return errorResponse(ApiError.internalError('Lỗi server', { details: e?.message }));
  }
}
