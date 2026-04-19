import { NextRequest } from 'next/server';
import { requireApiRole } from '@/lib/guards';
import { rateLimit } from '@/lib/rateLimit';
import { dbRun, dbGet } from '@/lib/database';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import { teacherCanAccessActivity } from '@/lib/activity-access';
import { markStudentAttendanceAndScore } from '@/lib/teacher-bulk-attendance';

// POST /api/teacher/attendance/bulk - Điểm danh hàng loạt cho học viên
export async function POST(request: NextRequest) {
  try {
    const rl = rateLimit(request, 20, 60 * 1000);
    if (!rl.allowed) {
      return errorResponse(new ApiError('RATE_LIMITED', 'Too many requests', 429));
    }

    const user = await requireApiRole(request, ['teacher', 'admin']);

    const body = await request.json();
    const { activity_id, student_ids, notes } = body;

    // Validation
    if (!activity_id || !student_ids || !Array.isArray(student_ids)) {
      return errorResponse(
        ApiError.validation('Thiếu trường bắt buộc: activity_id, student_ids (mảng)')
      );
    }

    if (student_ids.length === 0) {
      return errorResponse(ApiError.validation('Danh sách student_ids không được rỗng'));
    }

    // Verify activity exists and teacher has permission
    const activity = (await dbGet(`SELECT id, teacher_id, title FROM activities WHERE id = ?`, [
      activity_id,
    ])) as any;

    if (!activity) {
      return errorResponse(ApiError.notFound('Không tìm thấy hoạt động'));
    }

    if (
      user.role === 'teacher' &&
      !(await teacherCanAccessActivity(Number(user.id), Number(activity_id)))
    ) {
      return errorResponse(
        ApiError.forbidden('Bạn chỉ có thể điểm danh cho hoạt động do mình tổ chức')
      );
    }

    const results = {
      success: [] as any[],
      failed: [] as any[],
    };

    // Điểm danh cho từng học viên, mỗi học viên là một boundary xử lý riêng
    for (const studentId of student_ids) {
      try {
        const attendanceResult = await markStudentAttendanceAndScore({
          activityId: Number(activity_id),
          studentId: Number(studentId),
          actor: { id: Number(user.id) },
          notes: notes || null,
        });

        results.success.push(attendanceResult);
      } catch (error: any) {
        results.failed.push({
          student_id: studentId,
          error: error?.message || 'Không thể điểm danh và đồng bộ điểm',
          stage: 'attendance_or_scoring_sync',
        });
      }
    }

    // Audit log
    await dbRun(
      `INSERT INTO audit_logs (actor_id, action, target_table, target_id, details, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [
        user.id,
        'BULK_ATTENDANCE',
        'activities',
        activity_id,
        JSON.stringify({
          total: student_ids.length,
          success: results.success.length,
          failed: results.failed.length,
          notes,
          failed_students: results.failed,
        }),
      ]
    );

    return successResponse(
      results,
      `Đã điểm danh ${results.success.length}/${student_ids.length} học viên`
    );
  } catch (error: any) {
    console.error('Lỗi điểm danh hàng loạt:', error);
    return errorResponse(
      error instanceof ApiError ||
        (error && typeof error.status === 'number' && typeof error.code === 'string')
        ? error
        : ApiError.internalError(error.message || 'Lỗi máy chủ')
    );
  }
}
