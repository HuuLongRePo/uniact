import { dbAll, dbGet } from '@/lib/database';

export type TeacherDashboardClassOverview = {
  id: number;
  name: string;
  student_count: number;
  active_students: number;
  participation_rate: number;
};

export type TeacherDashboardActivityOverview = {
  id: number;
  title: string;
  date_time: string;
  status: string;
  location: string | null;
  max_participants: number | null;
  registered_count: number;
  attended_count: number;
};

export type TeacherDashboardSummary = {
  total_activities: number;
  pending_requested: number;
  published_activities: number;
  approved_activities: number;
  this_week_activities: number;
  total_participants: number;
  total_attended: number;
};

export type TeacherDashboardMonthlyStat = {
  month: string;
  count: number;
  participants: number;
};

export type TeacherDashboardTypeStat = {
  type_name: string;
  type_color: string;
  count: number;
  avg_participants: number;
};

export type TeacherDashboardTopStudent = {
  student_id: number;
  student_name: string;
  class_name: string;
  total_points: number;
  activities_count: number;
};

export type TeacherDashboardRecentAttendance = {
  activity_title: string;
  student_name: string;
  attended_at: string;
};

export type TeacherDashboardSnapshot = {
  summary: TeacherDashboardSummary;
  classes: TeacherDashboardClassOverview[];
  activities: TeacherDashboardActivityOverview[];
  activitiesByMonth: TeacherDashboardMonthlyStat[];
  activitiesByType: TeacherDashboardTypeStat[];
  topStudents: TeacherDashboardTopStudent[];
  recentAttendance: TeacherDashboardRecentAttendance[];
  unreadNotifications: number;
};

export async function getTeacherDashboardSnapshot(
  teacherId: number
): Promise<TeacherDashboardSnapshot> {
  const classes = (await dbAll(
    `
    SELECT
      c.id,
      c.name,
      COUNT(DISTINCT u.id) as student_count,
      COUNT(DISTINCT p.student_id) as active_students,
      ROUND(COUNT(DISTINCT p.student_id) * 100.0 / NULLIF(COUNT(DISTINCT u.id), 0), 1) as participation_rate
    FROM classes c
    LEFT JOIN class_teachers ct ON ct.class_id = c.id
    LEFT JOIN users u ON u.class_id = c.id AND u.role = 'student'
    LEFT JOIN participations p ON p.student_id = u.id
      AND p.activity_id IN (SELECT id FROM activities WHERE teacher_id = ?)
    WHERE c.teacher_id = ? OR ct.teacher_id = ?
    GROUP BY c.id, c.name
    ORDER BY c.name ASC
    `,
    [teacherId, teacherId, teacherId]
  )) as TeacherDashboardClassOverview[];

  const activities = (await dbAll(
    `
    SELECT
      a.id,
      a.title,
      a.date_time,
      a.status,
      a.location,
      a.max_participants,
      COUNT(DISTINCT p.id) as registered_count,
      COUNT(DISTINCT CASE WHEN p.attendance_status = 'attended' THEN p.id END) as attended_count
    FROM activities a
    LEFT JOIN participations p ON p.activity_id = a.id
    WHERE a.teacher_id = ?
    GROUP BY a.id, a.title, a.date_time, a.status, a.location, a.max_participants
    ORDER BY a.date_time DESC
    LIMIT 10
    `,
    [teacherId]
  )) as TeacherDashboardActivityOverview[];

  const summary = (await dbGet(
    `
    SELECT
      COUNT(DISTINCT a.id) as total_activities,
      COUNT(DISTINCT CASE WHEN a.approval_status = 'requested' THEN a.id END) as pending_requested,
      COUNT(DISTINCT CASE WHEN a.status = 'published' THEN a.id END) as published_activities,
      COUNT(
        DISTINCT CASE
          WHEN a.approval_status = 'approved' OR a.status IN ('published', 'completed') THEN a.id
        END
      ) as approved_activities,
      COUNT(
        DISTINCT CASE
          WHEN date(a.date_time) >= date('now', '-6 days') THEN a.id
        END
      ) as this_week_activities,
      COUNT(DISTINCT p.id) as total_participants,
      COUNT(DISTINCT CASE WHEN p.attendance_status = 'attended' THEN p.id END) as total_attended
    FROM activities a
    LEFT JOIN participations p ON p.activity_id = a.id
    WHERE a.teacher_id = ?
    `,
    [teacherId]
  )) as TeacherDashboardSummary | undefined;

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
    [teacherId]
  )) as TeacherDashboardMonthlyStat[];

  const activitiesByType = (await dbAll(
    `
    SELECT
      COALESCE(at.name, 'Khac') as type_name,
      COALESCE(at.color, '#6B7280') as type_color,
      COUNT(DISTINCT a.id) as count,
      AVG((SELECT COUNT(*) FROM participations WHERE activity_id = a.id)) as avg_participants
    FROM activities a
    LEFT JOIN activity_types at ON at.id = a.activity_type_id
    WHERE a.teacher_id = ?
    GROUP BY at.id, at.name, at.color
    ORDER BY count DESC
    `,
    [teacherId]
  )) as TeacherDashboardTypeStat[];

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
    [teacherId]
  )) as TeacherDashboardTopStudent[];

  const recentAttendance = (await dbAll(
    `
    SELECT
      a.title as activity_title,
      u.name as student_name,
      ar.recorded_at as attended_at
    FROM attendance_records ar
    JOIN activities a ON ar.activity_id = a.id
    JOIN users u ON ar.student_id = u.id
    WHERE a.teacher_id = ?
      AND ar.recorded_at >= datetime('now', '-7 days')
    ORDER BY ar.recorded_at DESC
    LIMIT 20
    `,
    [teacherId]
  )) as TeacherDashboardRecentAttendance[];

  const notificationSummary = (await dbGet(
    `
    SELECT COUNT(*) as pending_notifications
    FROM notifications
    WHERE user_id = ?
      AND COALESCE(is_read, 0) = 0
    `,
    [teacherId]
  )) as { pending_notifications: number } | undefined;

  return {
    summary: {
      total_activities: Number(summary?.total_activities || 0),
      pending_requested: Number(summary?.pending_requested || 0),
      published_activities: Number(summary?.published_activities || 0),
      approved_activities: Number(summary?.approved_activities || 0),
      this_week_activities: Number(summary?.this_week_activities || 0),
      total_participants: Number(summary?.total_participants || 0),
      total_attended: Number(summary?.total_attended || 0),
    },
    classes: classes.map((item) => ({
      id: Number(item.id),
      name: String(item.name),
      student_count: Number(item.student_count || 0),
      active_students: Number(item.active_students || 0),
      participation_rate: Number(item.participation_rate || 0),
    })),
    activities: activities.map((item) => ({
      id: Number(item.id),
      title: String(item.title),
      date_time: String(item.date_time),
      status: String(item.status),
      location: item.location ? String(item.location) : null,
      max_participants:
        item.max_participants === null || item.max_participants === undefined
          ? null
          : Number(item.max_participants),
      registered_count: Number(item.registered_count || 0),
      attended_count: Number(item.attended_count || 0),
    })),
    activitiesByMonth: activitiesByMonth.map((item) => ({
      month: String(item.month),
      count: Number(item.count || 0),
      participants: Number(item.participants || 0),
    })),
    activitiesByType: activitiesByType.map((item) => ({
      type_name: String(item.type_name),
      type_color: String(item.type_color || '#6B7280'),
      count: Number(item.count || 0),
      avg_participants: Number(item.avg_participants || 0),
    })),
    topStudents: topStudents.map((item) => ({
      student_id: Number(item.student_id),
      student_name: String(item.student_name),
      class_name: item.class_name ? String(item.class_name) : '',
      total_points: Number(item.total_points || 0),
      activities_count: Number(item.activities_count || 0),
    })),
    recentAttendance: recentAttendance.map((item) => ({
      activity_title: String(item.activity_title),
      student_name: String(item.student_name),
      attended_at: String(item.attended_at),
    })),
    unreadNotifications: Number(notificationSummary?.pending_notifications || 0),
  };
}
