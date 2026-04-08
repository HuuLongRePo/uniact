import { NextRequest, NextResponse } from 'next/server';
import { getUserFromSession } from '@/lib/auth';
import { dbAll } from '@/lib/database';
import { ApiError, errorResponse } from '@/lib/api-response';

type ActivityStatisticsRow = {
  id: number;
  title: string;
  date_time: string;
  location: string | null;
  organizer_name: string | null;
  activity_type: string | null;
  organization_level: string | null;
  max_participants: number | null;
  total_participants: number;
  attended_count: number;
  registered_only: number;
  excellent_count: number;
  good_count: number;
  avg_points_per_student: number;
};

type ActivityStatisticsSummary = {
  total_activities: number;
  total_participants: number;
  total_attended: number;
  avg_participants_per_activity: number;
  attendance_rate: number;
};

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toCsvValue(value: string | number): string {
  const normalized = String(value).replace(/"/g, '""');
  return `"${normalized}"`;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'admin') {
      return errorResponse(ApiError.forbidden('Bạn không có quyền truy cập báo cáo thống kê.'));
    }

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start_date') || '';
    const endDate = searchParams.get('end_date') || '';
    const format = searchParams.get('format') || 'json';

    let query = `
      SELECT 
        a.id,
        a.title,
        a.date_time,
        a.location,
        u.name as organizer_name,
        at.name as activity_type,
        ol.name as organization_level,
        a.max_participants,
        COUNT(DISTINCT p.id) as total_participants,
        COUNT(DISTINCT CASE WHEN p.attendance_status = 'attended' THEN p.id END) as attended_count,
        COUNT(DISTINCT CASE WHEN p.attendance_status = 'registered' THEN p.id END) as registered_only,
        COUNT(DISTINCT CASE WHEN p.achievement_level = 'excellent' THEN p.id END) as excellent_count,
        COUNT(DISTINCT CASE WHEN p.achievement_level = 'good' THEN p.id END) as good_count,
        COALESCE(AVG(pc.total_points), 0) as avg_points_per_student
      FROM activities a
      LEFT JOIN users u ON a.teacher_id = u.id
      LEFT JOIN activity_types at ON a.activity_type_id = at.id
      LEFT JOIN organization_levels ol ON a.organization_level_id = ol.id
      LEFT JOIN participations p ON a.id = p.activity_id
      LEFT JOIN point_calculations pc ON p.id = pc.participation_id
      WHERE a.status IN ('published', 'completed')
    `;
    const params: string[] = [];

    if (startDate) {
      query += ` AND date(a.date_time) >= date(?)`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND date(a.date_time) <= date(?)`;
      params.push(endDate);
    }

    query += ` GROUP BY a.id ORDER BY a.date_time DESC`;

    const activities = ((await dbAll(query, params)) as ActivityStatisticsRow[]).map((activity) => ({
      ...activity,
      max_participants: toNumber(activity.max_participants),
      total_participants: toNumber(activity.total_participants),
      attended_count: toNumber(activity.attended_count),
      registered_only: toNumber(activity.registered_only),
      excellent_count: toNumber(activity.excellent_count),
      good_count: toNumber(activity.good_count),
      avg_points_per_student: toNumber(activity.avg_points_per_student),
    }));

    const totalParticipants = activities.reduce(
      (sum, activity) => sum + activity.total_participants,
      0
    );
    const totalAttended = activities.reduce((sum, activity) => sum + activity.attended_count, 0);

    const stats: ActivityStatisticsSummary = {
      total_activities: activities.length,
      total_participants: totalParticipants,
      total_attended: totalAttended,
      avg_participants_per_activity:
        activities.length > 0 ? totalParticipants / activities.length : 0,
      attendance_rate: totalParticipants > 0 ? (totalAttended / totalParticipants) * 100 : 0,
    };

    if (format === 'csv') {
      const rows = [
        [
          'Tiêu đề',
          'Thời gian',
          'Địa điểm',
          'Người tổ chức',
          'Loại hoạt động',
          'Cấp tổ chức',
          'Số đăng ký',
          'Số đã tham gia',
          'Số xuất sắc',
          'Số tốt',
          'Điểm trung bình',
        ],
        ...activities.map((activity) => [
          activity.title,
          new Date(activity.date_time).toLocaleString('vi-VN'),
          activity.location || '',
          activity.organizer_name || '',
          activity.activity_type || '',
          activity.organization_level || '',
          activity.total_participants,
          activity.attended_count,
          activity.excellent_count,
          activity.good_count,
          activity.avg_points_per_student.toFixed(2),
        ]),
      ];

      const csv = `\uFEFF${rows
        .map((row) => row.map((value) => toCsvValue(value)).join(','))
        .join('\n')}`;

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="activity-statistics-${Date.now()}.csv"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: activities,
      statistics: stats,
    });
  } catch (error: unknown) {
    console.error('Error generating activity statistics:', error);
    return errorResponse(
      ApiError.internalError(
        error instanceof Error ? error.message : 'Không thể tạo báo cáo thống kê.'
      )
    );
  }
}
