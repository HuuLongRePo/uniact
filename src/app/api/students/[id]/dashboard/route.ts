import { NextRequest, NextResponse } from 'next/server';
import { getUserFromSession } from '@/lib/auth';
import { dbGet, dbAll } from '@/lib/database';
import { ApiError, successResponse, errorResponse } from '@/lib/api-response';

/**
 * GET /api/students/[id]/dashboard
 * Lấy dữ liệu dashboard cho student
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getUserFromSession();
    if (!user || user.role !== 'student') {
      return errorResponse(ApiError.forbidden('Chỉ học viên mới được truy cập'));
    }

    const studentId = Number(id);
    if (isNaN(studentId) || studentId !== user.id) {
      return errorResponse(ApiError.forbidden('Chỉ được xem bảng điều khiển của chính bạn'));
    }

    // Personal stats
    const stats = (await dbGet(
      `
      SELECT 
        COALESCE(SUM(ss.points), 0) as total_points,
        COUNT(DISTINCT CASE WHEN p.attendance_status = 'attended' THEN p.id END) as activities_participated,
        COUNT(DISTINCT CASE WHEN p.attendance_status IN ('registered', 'attended') THEN p.id END) as activities_registered,
        (SELECT COUNT(*) + 1 FROM users u2 
         LEFT JOIN student_scores ss2 ON ss2.student_id = u2.id
         WHERE u2.class_id = ? AND u2.id != ? 
         GROUP BY u2.id
         HAVING COALESCE(SUM(ss2.points), 0) > COALESCE((SELECT SUM(points) FROM student_scores WHERE student_id = ?), 0)
        ) as rank_in_class,
        (SELECT COUNT(*) FROM users WHERE class_id = ? AND role = 'student') as total_in_class
      FROM participations p
      LEFT JOIN student_scores ss ON ss.participation_id = p.id
      WHERE p.student_id = ?
      `,
      [user.class_id, user.id, user.id, user.class_id, user.id]
    )) as {
      total_points: number;
      activities_participated: number;
      activities_registered: number;
      rank_in_class: number;
      total_in_class: number;
    };

    // Upcoming activities
    const upcomingActivities = (await dbAll(
      `
      SELECT 
        a.id,
        a.title,
        a.date_time,
        a.location,
        p.attendance_status,
        p.registration_date
      FROM participations p
      JOIN activities a ON a.id = p.activity_id
      WHERE p.student_id = ?
        AND a.date_time >= datetime('now')
      ORDER BY a.date_time ASC
      LIMIT 5
      `,
      [user.id]
    )) as Array<{
      id: number;
      title: string;
      date_time: string;
      location: string;
      attendance_status: string;
      registration_date: string;
    }>;

    // Scores breakdown by type
    const scoresByType = (await dbAll(
      `
      SELECT 
        at.name as type_name,
        at.color as type_color,
        SUM(ss.points) as total_points,
        COUNT(DISTINCT ss.participation_id) as count
      FROM student_scores ss
      JOIN participations p ON p.id = ss.participation_id
      JOIN activities a ON a.id = p.activity_id
      LEFT JOIN activity_types at ON at.id = a.activity_type_id
      WHERE ss.student_id = ?
      GROUP BY at.id, at.name, at.color
      ORDER BY total_points DESC
      `,
      [user.id]
    )) as Array<{
      type_name: string;
      type_color: string;
      total_points: number;
      count: number;
    }>;

    // Recent achievements
    const recentAchievements = (await dbAll(
      `
      SELECT 
        a.title as activity_title,
        p.achievement_level,
        ss.points,
        p.evaluated_at
      FROM participations p
      JOIN activities a ON a.id = p.activity_id
      LEFT JOIN student_scores ss ON ss.participation_id = p.id
      WHERE p.student_id = ?
        AND p.achievement_level IS NOT NULL
      ORDER BY p.evaluated_at DESC
      LIMIT 5
      `,
      [user.id]
    )) as Array<{
      activity_title: string;
      achievement_level: string;
      points: number;
      evaluated_at: string;
    }>;

    // Class ranking (top 10)
    const classRanking = (await dbAll(
      `
      SELECT 
        u.id as student_id,
        u.name as student_name,
        COALESCE(SUM(ss.points), 0) as total_points,
        RANK() OVER (ORDER BY COALESCE(SUM(ss.points), 0) DESC) as rank
      FROM users u
      LEFT JOIN student_scores ss ON ss.student_id = u.id
      WHERE u.class_id = ? AND u.role = 'student'
      GROUP BY u.id, u.name
      ORDER BY total_points DESC
      LIMIT 10
      `,
      [user.class_id]
    )) as Array<{
      student_id: number;
      student_name: string;
      total_points: number;
      rank: number;
    }>;

    return successResponse({
      stats: stats || {
        total_points: 0,
        activities_participated: 0,
        activities_registered: 0,
        rank_in_class: 1,
        total_in_class: 1,
      },
      upcomingActivities,
      scoresByType,
      recentAchievements,
      classRanking,
    });
  } catch (error: any) {
    console.error('Lỗi lấy dữ liệu bảng điều khiển học viên:', error);
    return errorResponse(
      ApiError.internalError('Không thể lấy dữ liệu bảng điều khiển', { details: error?.message })
    );
  }
}
