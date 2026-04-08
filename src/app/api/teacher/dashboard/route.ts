import { getUserFromSession } from '@/lib/auth';
import { dbAll, dbGet } from '@/lib/database';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

type TeacherDashboardClassRow = {
  id: number;
  name: string;
  student_count: number;
};

type TeacherDashboardActivityRow = {
  id: number;
  title: string;
  date_time: string;
  end_time: null;
  location: string | null;
  max_participants: number | null;
  registered_count: number;
  attended_count: number;
};

type TeacherDashboardSummaryRow = {
  total_activities: number;
  pending_approval: number;
  approved_activities: number;
  this_week_activities: number;
};

type TeacherParticipationSummaryRow = {
  total_participations: number;
  total_attended: number;
};

type TeacherNotificationSummaryRow = {
  pending_notifications: number;
};

type TeacherRecentAttendanceRow = {
  activity_title: string;
  student_name: string;
  attended_at: string;
};

// GET /api/teacher/dashboard - Lay thong ke tong quan cho giang vien
export async function GET() {
  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'teacher') {
      return errorResponse(ApiError.forbidden('Chỉ giảng viên mới có thể truy cập'));
    }

    const classes = (await dbAll(
      `SELECT 
        c.id,
        c.name,
        COUNT(DISTINCT u.id) as student_count
      FROM class_teachers ct
      JOIN classes c ON ct.class_id = c.id
      LEFT JOIN users u ON c.id = u.class_id AND u.role = 'student'
      WHERE ct.teacher_id = ?
      GROUP BY c.id, c.name
      ORDER BY c.name ASC`,
      [user.id]
    )) as TeacherDashboardClassRow[];

    const activities = (await dbAll(
      `SELECT 
        a.id,
        a.title,
        a.date_time,
        NULL as end_time,
        a.location,
        a.max_participants,
        COUNT(DISTINCT p.id) as registered_count,
        COUNT(DISTINCT CASE WHEN p.attendance_status = 'attended' THEN p.id END) as attended_count
      FROM activities a
      LEFT JOIN participations p ON p.activity_id = a.id
      WHERE a.teacher_id = ?
      GROUP BY a.id, a.title, a.date_time, a.location, a.max_participants
      ORDER BY a.date_time DESC
      LIMIT 10`,
      [user.id]
    )) as TeacherDashboardActivityRow[];

    const summary = (await dbGet(
      `SELECT 
        COUNT(DISTINCT a.id) as total_activities,
        COUNT(DISTINCT CASE WHEN a.approval_status = 'requested' THEN a.id END) as pending_approval,
        COUNT(
          DISTINCT CASE
            WHEN a.approval_status = 'approved' OR a.status IN ('published', 'completed') THEN a.id
          END
        ) as approved_activities,
        COUNT(
          DISTINCT CASE
            WHEN date(a.date_time) >= date('now', '-6 days') THEN a.id
          END
        ) as this_week_activities
      FROM activities a
      WHERE a.teacher_id = ?`,
      [user.id]
    )) as TeacherDashboardSummaryRow | undefined;

    const participationSummary = (await dbGet(
      `SELECT 
        COUNT(DISTINCT p.id) as total_participations,
        COUNT(DISTINCT CASE WHEN p.attendance_status = 'attended' THEN p.id END) as total_attended
      FROM activities a
      LEFT JOIN participations p ON a.id = p.activity_id
      WHERE a.teacher_id = ?`,
      [user.id]
    )) as TeacherParticipationSummaryRow | undefined;

    const notificationSummary = (await dbGet(
      `SELECT COUNT(*) as pending_notifications
      FROM notifications
      WHERE user_id = ?
        AND COALESCE(is_read, 0) = 0`,
      [user.id]
    )) as TeacherNotificationSummaryRow | undefined;

    const recentAttendance = (await dbAll(
      `SELECT 
        a.title as activity_title,
        u.name as student_name,
        ar.recorded_at as attended_at
      FROM attendance_records ar
      JOIN activities a ON ar.activity_id = a.id
      JOIN users u ON ar.student_id = u.id
      WHERE a.teacher_id = ?
        AND ar.recorded_at >= datetime('now', '-7 days')
      ORDER BY ar.recorded_at DESC
      LIMIT 20`,
      [user.id]
    )) as TeacherRecentAttendanceRow[];

    const totalStudents = classes.reduce(
      (sum, item) => sum + Number(item.student_count || 0),
      0
    );
    const totalParticipations = Number(participationSummary?.total_participations || 0);
    const totalAttended = Number(participationSummary?.total_attended || 0);

    const stats = {
      total_classes: classes.length,
      total_students: totalStudents,
      total_activities: Number(summary?.total_activities || 0),
      pending_approval: Number(summary?.pending_approval || 0),
      approved_activities: Number(summary?.approved_activities || 0),
      pending_notifications: Number(notificationSummary?.pending_notifications || 0),
      this_week_activities: Number(summary?.this_week_activities || 0),
      total_participations: totalParticipations,
      total_attended: totalAttended,
      attendance_rate:
        totalParticipations > 0 ? Math.round((totalAttended / totalParticipations) * 100) : 0,
    };

    return successResponse({
      ...stats,
      classes,
      activities,
      stats,
      recentAttendance,
    });
  } catch (error: unknown) {
    console.error('Lỗi lấy dashboard giảng viên:', error);
    return errorResponse(
      ApiError.internalError('Không thể lấy dữ liệu tổng quan', {
        details: error instanceof Error ? error.message : 'Unknown error',
      })
    );
  }
}
