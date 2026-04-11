import { getUserFromSession } from '@/lib/auth';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import { getTeacherDashboardSnapshot } from '@/lib/teacher-dashboard-data';

// GET /api/teacher/dashboard - compatibility overview for older teacher clients
export async function GET() {
  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'teacher') {
      return errorResponse(ApiError.forbidden('Chi giang vien moi co the truy cap'));
    }

    const snapshot = await getTeacherDashboardSnapshot(Number(user.id));
    const totalStudents = snapshot.classes.reduce((sum, item) => sum + item.student_count, 0);
    const totalParticipations = snapshot.summary.total_participants;
    const totalAttended = snapshot.summary.total_attended;

    const stats = {
      total_classes: snapshot.classes.length,
      total_students: totalStudents,
      total_activities: snapshot.summary.total_activities,
      pending_approval: snapshot.summary.pending_requested,
      approved_activities: snapshot.summary.approved_activities,
      pending_notifications: snapshot.unreadNotifications,
      this_week_activities: snapshot.summary.this_week_activities,
      total_participations: totalParticipations,
      total_attended: totalAttended,
      attendance_rate:
        totalParticipations > 0 ? Math.round((totalAttended / totalParticipations) * 100) : 0,
    };

    return successResponse({
      ...stats,
      classes: snapshot.classes.map((item) => ({
        id: item.id,
        name: item.name,
        student_count: item.student_count,
      })),
      activities: snapshot.activities.map((item) => ({
        id: item.id,
        title: item.title,
        date_time: item.date_time,
        end_time: null,
        status: item.status,
        location: item.location,
        max_participants: item.max_participants,
        registered_count: item.registered_count,
        attended_count: item.attended_count,
      })),
      stats,
      recentAttendance: snapshot.recentAttendance,
    });
  } catch (error: unknown) {
    console.error('Loi lay dashboard giang vien:', error);
    return errorResponse(
      ApiError.internalError('Khong the lay du lieu tong quan', {
        details: error instanceof Error ? error.message : 'Unknown error',
      })
    );
  }
}
