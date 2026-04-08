import { NextRequest, NextResponse } from 'next/server';
import { getUserFromSession } from '@/lib/auth';
import { dbAll, dbGet } from '@/lib/database';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

/**
 * GET /api/teacher/dashboard-stats
 * Lấy dữ liệu thống kê cho teacher dashboard
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'teacher') {
      return errorResponse(ApiError.forbidden('Chỉ giảng viên mới có thể truy cập'));
    }

    // Summary stats
    const summary = (await dbGet(
      `
      SELECT 
        COUNT(DISTINCT a.id) as total_activities,
        COUNT(DISTINCT CASE WHEN a.approval_status = 'requested' THEN a.id END) as pending_activities,
        COUNT(DISTINCT CASE WHEN a.status = 'published' THEN a.id END) as published_activities,
        COUNT(DISTINCT p.id) as total_participants,
        COUNT(DISTINCT CASE WHEN p.attendance_status = 'attended' THEN p.id END) as total_attended
      FROM activities a
      LEFT JOIN participations p ON p.activity_id = a.id
      WHERE a.teacher_id = ?
      `,
      [user.id]
    )) as {
      total_activities: number;
      pending_activities: number;
      published_activities: number;
      total_participants: number;
      total_attended: number;
    };

    // Activities by month (last 6 months)
    const activitiesByMonth = (await dbAll(
      `
      SELECT 
        strftime('%Y-%m', a.date_time) as month,
        COUNT(DISTINCT a.id) as count,
        COUNT(DISTINCT p.id) as participants
      FROM activities a
      LEFT JOIN participations p ON p.activity_id = a.id
      WHERE a.teacher_id = ?
        AND a.date_time >= date('now', '-6 months')
      GROUP BY strftime('%Y-%m', a.date_time)
      ORDER BY month ASC
      `,
      [user.id]
    )) as Array<{
      month: string;
      count: number;
      participants: number;
    }>;

    // Activities by type
    const activitiesByType = (await dbAll(
      `
      SELECT 
        COALESCE(at.name, 'Khác') as type_name,
        COALESCE(at.color, '#6B7280') as type_color,
        COUNT(DISTINCT a.id) as count,
        AVG((SELECT COUNT(*) FROM participations WHERE activity_id = a.id)) as avg_participants
      FROM activities a
      LEFT JOIN activity_types at ON at.id = a.activity_type_id
      WHERE a.teacher_id = ?
      GROUP BY at.id, at.name, at.color
      ORDER BY count DESC
      `,
      [user.id]
    )) as Array<{
      type_name: string;
      type_color: string;
      count: number;
      avg_participants: number;
    }>;

    // Student participation by class
    const participationByClass = (await dbAll(
      `
      SELECT 
        c.name as class_name,
        COUNT(DISTINCT u.id) as total_students,
        COUNT(DISTINCT p.student_id) as active_students,
        ROUND(COUNT(DISTINCT p.student_id) * 100.0 / NULLIF(COUNT(DISTINCT u.id), 0), 1) as participation_rate
      FROM classes c
      LEFT JOIN users u ON u.class_id = c.id AND u.role = 'student'
      LEFT JOIN participations p ON p.student_id = u.id
        AND p.activity_id IN (SELECT id FROM activities WHERE teacher_id = ?)
      WHERE c.id IN (
        SELECT DISTINCT class_id FROM class_teachers WHERE teacher_id = ?
        UNION
        SELECT DISTINCT id FROM classes WHERE teacher_id = ?
      )
      GROUP BY c.id, c.name
      ORDER BY participation_rate DESC
      `,
      [user.id, user.id, user.id]
    )) as Array<{
      class_name: string;
      total_students: number;
      active_students: number;
      participation_rate: number;
    }>;

    // Recent activities
    const recentActivities = (await dbAll(
      `
      SELECT 
        a.id,
        a.title,
        a.date_time,
        a.status,
        COUNT(DISTINCT p.id) as participant_count,
        COUNT(DISTINCT CASE WHEN p.attendance_status = 'attended' THEN p.id END) as attended_count
      FROM activities a
      LEFT JOIN participations p ON p.activity_id = a.id
      WHERE a.teacher_id = ?
      GROUP BY a.id, a.title, a.date_time, a.status
      ORDER BY a.date_time DESC
      LIMIT 5
      `,
      [user.id]
    )) as Array<{
      id: number;
      title: string;
      date_time: string;
      status: string;
      participant_count: number;
      attended_count: number;
    }>;

    // Top performing students
    const topStudents = (await dbAll(
      `
      SELECT 
        u.id as student_id,
        u.name as student_name,
        c.name as class_name,
        COALESCE(SUM(ss.points), 0) as total_points,
        COUNT(DISTINCT p.id) as activities_count
      FROM participations p
      JOIN users u ON u.id = p.student_id
      LEFT JOIN classes c ON c.id = u.class_id
      LEFT JOIN student_scores ss ON ss.activity_id = p.activity_id AND ss.student_id = p.student_id
      WHERE p.activity_id IN (SELECT id FROM activities WHERE teacher_id = ?)
        AND p.attendance_status = 'attended'
      GROUP BY u.id, u.name, c.name
      ORDER BY total_points DESC
      LIMIT 10
      `,
      [user.id]
    )) as Array<{
      student_id: number;
      student_name: string;
      class_name: string;
      total_points: number;
      activities_count: number;
    }>;

    return successResponse({
      summary: summary || {
        total_activities: 0,
        pending_activities: 0,
        published_activities: 0,
        total_participants: 0,
        total_attended: 0,
      },
      activitiesByMonth,
      activitiesByType,
      participationByClass,
      recentActivities,
      topStudents,
    });
  } catch (error: any) {
    console.error('Lỗi lấy thống kê dashboard giảng viên:', error);
    return errorResponse(
      ApiError.internalError('Không thể lấy thống kê dashboard', { details: error.message })
    );
  }
}
