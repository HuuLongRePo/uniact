import { NextRequest } from 'next/server';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import { requireApiRole } from '@/lib/guards';
import { getTeacherDashboardSnapshot } from '@/lib/teacher-dashboard-data';

/**
 * GET /api/teacher/dashboard-stats
 * Lay du lieu thong ke cho teacher dashboard
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireApiRole(request, ['teacher']);

    const snapshot = await getTeacherDashboardSnapshot(Number(user.id));

    return successResponse({
      summary: {
        total_activities: snapshot.summary.total_activities,
        pending_activities: snapshot.summary.pending_requested,
        published_activities: snapshot.summary.published_activities,
        total_participants: snapshot.summary.total_participants,
        total_attended: snapshot.summary.total_attended,
      },
      activitiesByMonth: snapshot.activitiesByMonth,
      activitiesByType: snapshot.activitiesByType,
      participationByClass: snapshot.classes.map((item) => ({
        class_name: item.name,
        total_students: item.student_count,
        active_students: item.active_students,
        participation_rate: item.participation_rate,
      })),
      recentActivities: snapshot.activities.slice(0, 5).map((item) => ({
        id: item.id,
        title: item.title,
        date_time: item.date_time,
        status: item.status,
        participant_count: item.registered_count,
        attended_count: item.attended_count,
      })),
      topStudents: snapshot.topStudents,
    });
  } catch (error: any) {
    console.error('Loi lay thong ke dashboard giang vien:', error);
    return errorResponse(
      error instanceof ApiError ||
        (error && typeof error.status === 'number' && typeof error.code === 'string')
        ? error
        : ApiError.internalError('Khong the lay thong ke dashboard', { details: error?.message })
    );
  }
}
