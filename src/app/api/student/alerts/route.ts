import { NextRequest } from 'next/server';
import { getUserFromSession } from '@/lib/auth';
import { dbAll } from '@/lib/database';
import { apiHandler, ApiError, successResponse } from '@/lib/api-response';
import { formatDate } from '@/lib/formatters';

type StudentAlert = {
  id: number;
  type: 'low_attendance' | 'deadline';
  title: string;
  message: string;
  severity: 'info' | 'warning';
  created_at: string;
};

type AttendanceSummaryRow = {
  total: number;
};

type UpcomingActivityRow = {
  id: number;
  title: string;
  date_time: string;
  registration_deadline: string | null;
  alert_date: string;
};

export const GET = apiHandler(async (request: NextRequest) => {
  const user = await getUserFromSession(request);
  if (!user || user.role !== 'student') {
    throw ApiError.unauthorized('Bạn không có quyền truy cập');
  }

  const alerts: StudentAlert[] = [];
  const nowIso = new Date().toISOString();

  const attendanceSummary = (await dbAll(
    `
      SELECT COUNT(*) as total
      FROM participations
      WHERE user_id = ? AND attendance_status = 'absent'
    `,
    [user.id]
  )) as AttendanceSummaryRow[];

  if ((attendanceSummary[0]?.total ?? 0) > 3) {
    alerts.push({
      id: 1,
      type: 'low_attendance',
      title: 'Tỷ lệ vắng mặt cao',
      message: `Bạn đã vắng ${attendanceSummary[0].total} hoạt động. Hãy cải thiện tỷ lệ tham gia để tránh bị ảnh hưởng điểm rèn luyện.`,
      severity: 'warning',
      created_at: nowIso,
    });
  }

  const upcomingActivities = (await dbAll(
    `
      SELECT
        a.id,
        a.title,
        a.date_time,
        a.registration_deadline,
        COALESCE(a.registration_deadline, a.date_time) AS alert_date
      FROM activities a
      WHERE a.status = 'published'
        AND a.date_time > datetime('now')
        AND COALESCE(a.registration_deadline, a.date_time) > datetime('now')
        AND COALESCE(a.registration_deadline, a.date_time) < datetime('now', '+3 days')
        AND NOT EXISTS (
          SELECT 1
          FROM participations p
          WHERE p.activity_id = a.id AND p.user_id = ?
        )
      ORDER BY COALESCE(a.registration_deadline, a.date_time) ASC
      LIMIT 3
    `,
    [user.id]
  )) as UpcomingActivityRow[];

  upcomingActivities.forEach((activity, index) => {
    const alertDate = activity.registration_deadline || activity.alert_date || activity.date_time;
    const hasRegistrationDeadline = Boolean(activity.registration_deadline);

    alerts.push({
      id: index + 10,
      type: 'deadline',
      title: hasRegistrationDeadline ? 'Hạn đăng ký sắp hết' : 'Hoạt động sắp diễn ra',
      message: hasRegistrationDeadline
        ? `Hạn đăng ký hoạt động "${activity.title}" sẽ kết thúc vào ${formatDate(alertDate)}.`
        : `Hoạt động "${activity.title}" sẽ diễn ra vào ${formatDate(alertDate)}.`,
      severity: 'info',
      created_at: nowIso,
    });
  });

  return successResponse({ alerts });
});
