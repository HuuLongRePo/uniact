import { NextRequest } from 'next/server';
import { requireApiRole } from '@/lib/guards';
import { rateLimit } from '@/lib/rateLimit';
import { dbRun, dbGet } from '@/lib/database';
import { PointCalculationService } from '@/lib/scoring';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import { teacherCanAccessActivity } from '@/lib/activity-access';

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

    // Điểm danh cho từng học viên
    for (const studentId of student_ids) {
      try {
        // Kiểm tra đã có đăng ký tham gia chưa
        let participation = (await dbGet(
          `SELECT id, attendance_status FROM participations 
           WHERE activity_id = ? AND student_id = ?`,
          [activity_id, studentId]
        )) as any;

        if (!participation) {
          const result = await dbRun(
            `INSERT INTO participations (activity_id, student_id, attendance_status)
             VALUES (?, ?, 'attended')`,
            [activity_id, studentId]
          );
          participation = { id: result.lastID, attendance_status: 'attended' };
        } else if (participation.attendance_status !== 'attended') {
          await dbRun(
            `UPDATE participations 
             SET attendance_status = 'attended', updated_at = datetime('now')
             WHERE id = ?`,
            [participation.id]
          );
        }

        // Ghi nhận điểm danh (tránh trùng: bỏ qua nếu đã tồn tại)
        const existingRecord = (await dbGet(
          'SELECT id FROM attendance_records WHERE activity_id = ? AND student_id = ? LIMIT 1',
          [activity_id, studentId]
        )) as any;
        if (!existingRecord) {
          await dbRun(
            `INSERT INTO attendance_records (qr_session_id, activity_id, student_id, recorded_by, method, note)
             VALUES (NULL, ?, ?, ?, 'bulk', ?)`,
            [activity_id, studentId, user.id, notes || null]
          );
        }

        // Tự động tính và lưu điểm khi attendance đã được xác nhận
        const calculation = await PointCalculationService.autoCalculateAfterEvaluation(
          participation.id
        );

        results.success.push({
          student_id: studentId,
          participation_id: participation.id,
          points: calculation.totalPoints,
        });
      } catch (error: any) {
        results.failed.push({
          student_id: studentId,
          error: error.message,
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
