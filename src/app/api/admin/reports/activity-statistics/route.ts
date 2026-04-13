import { NextRequest, NextResponse } from 'next/server';
import { dbAll } from '@/lib/database';
import { requireApiRole } from '@/lib/guards';
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
  manual_attendance_count: number;
  qr_attendance_count: number;
  face_attendance_count: number;
};

type ActivityStatisticsSummary = {
  total_activities: number;
  total_participants: number;
  total_attended: number;
  total_registered_only: number;
  total_manual_attendance: number;
  total_qr_attendance: number;
  total_face_attendance: number;
  avg_participants_per_activity: number;
  attendance_rate: number;
  face_adoption_rate: number;
};

type ActivityStatisticsInsights = {
  top_not_participated_activities: Array<{
    id: number;
    title: string;
    registered_only: number;
    total_participants: number;
    attended_count: number;
  }>;
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
    await requireApiRole(request, ['admin']);

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
        COALESCE(AVG(pc.total_points), 0) as avg_points_per_student,
        (
          SELECT COUNT(DISTINCT ar_manual.student_id)
          FROM attendance_records ar_manual
          WHERE ar_manual.activity_id = a.id AND ar_manual.method = 'manual'
        ) as manual_attendance_count,
        (
          SELECT COUNT(DISTINCT ar_qr.student_id)
          FROM attendance_records ar_qr
          WHERE ar_qr.activity_id = a.id AND ar_qr.method = 'qr'
        ) as qr_attendance_count,
        (
          SELECT COUNT(DISTINCT ar_face.student_id)
          FROM attendance_records ar_face
          WHERE ar_face.activity_id = a.id AND ar_face.method = 'face'
        ) as face_attendance_count
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
      manual_attendance_count: toNumber(activity.manual_attendance_count),
      qr_attendance_count: toNumber(activity.qr_attendance_count),
      face_attendance_count: toNumber(activity.face_attendance_count),
    }));

    const totalParticipants = activities.reduce(
      (sum, activity) => sum + activity.total_participants,
      0
    );
    const totalAttended = activities.reduce((sum, activity) => sum + activity.attended_count, 0);
    const totalRegisteredOnly = activities.reduce(
      (sum, activity) => sum + activity.registered_only,
      0
    );
    const totalManualAttendance = activities.reduce(
      (sum, activity) => sum + activity.manual_attendance_count,
      0
    );
    const totalQrAttendance = activities.reduce(
      (sum, activity) => sum + activity.qr_attendance_count,
      0
    );
    const totalFaceAttendance = activities.reduce(
      (sum, activity) => sum + activity.face_attendance_count,
      0
    );

    const stats: ActivityStatisticsSummary = {
      total_activities: activities.length,
      total_participants: totalParticipants,
      total_attended: totalAttended,
      total_registered_only: totalRegisteredOnly,
      total_manual_attendance: totalManualAttendance,
      total_qr_attendance: totalQrAttendance,
      total_face_attendance: totalFaceAttendance,
      avg_participants_per_activity:
        activities.length > 0 ? totalParticipants / activities.length : 0,
      attendance_rate: totalParticipants > 0 ? (totalAttended / totalParticipants) * 100 : 0,
      face_adoption_rate: totalAttended > 0 ? (totalFaceAttendance / totalAttended) * 100 : 0,
    };

    const insights: ActivityStatisticsInsights = {
      top_not_participated_activities: activities
        .filter((activity) => activity.registered_only > 0)
        .sort((left, right) => right.registered_only - left.registered_only)
        .slice(0, 5)
        .map((activity) => ({
          id: activity.id,
          title: activity.title,
          registered_only: activity.registered_only,
          total_participants: activity.total_participants,
          attended_count: activity.attended_count,
        })),
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
          'Chưa tham gia',
          'Thủ công',
          'QR',
          'Face',
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
          activity.registered_only,
          activity.manual_attendance_count,
          activity.qr_attendance_count,
          activity.face_attendance_count,
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
      insights,
    });
  } catch (error: any) {
    console.error('Error generating activity statistics:', error);
    return errorResponse(
      error instanceof ApiError ||
        (error && typeof error.status === 'number' && typeof error.code === 'string')
        ? error
        : ApiError.internalError(
            error instanceof Error ? error.message : 'Không thể tạo báo cáo thống kê.'
          )
    );
  }
}
