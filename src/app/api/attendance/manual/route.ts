import { NextRequest } from 'next/server';
import { dbRun, dbGet, dbAll } from '@/lib/database';
import { requireApiRole } from '@/lib/guards';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import { teacherCanAccessActivity } from '@/lib/activity-access';
import { sendDatabaseNotification } from '@/lib/notifications';

// POST /api/attendance/manual - Điểm danh thủ công (không qua QR)
export async function POST(request: NextRequest) {
  try {
    const user = await requireApiRole(request, ['admin', 'teacher']);

    const { activity_id, student_ids, achievements } = await request.json();

    // Validation
    if (!activity_id) {
      return errorResponse(ApiError.validation('Vui lòng cung cấp activity_id'));
    }

    if (!student_ids || !Array.isArray(student_ids) || student_ids.length === 0) {
      return errorResponse(ApiError.validation('Danh sách học viên không hợp lệ'));
    }

    // achievements = { student_id: 'excellent' | 'good' | 'participated' | null }
    const achievementsMap = achievements || {};

    // Kiểm tra hoạt động tồn tại
    const activity = await dbGet(
      'SELECT id, title, teacher_id, date_time FROM activities WHERE id = ?',
      [activity_id]
    );

    if (!activity) {
      return errorResponse(ApiError.notFound('Hoạt động không tồn tại'));
    }

    // Kiểm tra quyền: teacher chỉ điểm danh cho hoạt động của mình
    if (
      user.role === 'teacher' &&
      !(await teacherCanAccessActivity(Number(user.id), Number(activity_id)))
    ) {
      return errorResponse(ApiError.forbidden('Bạn chỉ có thể điểm danh cho hoạt động của mình'));
    }

    let successCount = 0;
    let alreadyAttended = 0;
    const results = [];

    for (const studentId of student_ids) {
      try {
        // Kiểm tra học viên đã đăng ký chưa
        const participation = await dbGet(
          'SELECT id, attendance_status FROM participations WHERE activity_id = ? AND student_id = ?',
          [activity_id, studentId]
        );

        if (!participation) {
          results.push({ studentId, status: 'not_registered', message: 'Học viên chưa đăng ký' });
          continue;
        }

        // Kiểm tra đã có bản ghi điểm danh chưa
        const existingRecord = await dbGet(
          'SELECT id FROM attendance_records WHERE activity_id = ? AND student_id = ? LIMIT 1',
          [activity_id, studentId]
        );

        // Cập nhật trạng thái participation + achievement (luôn update để cho phép bổ sung achievement sau)
        const achievementLevel = achievementsMap[studentId] || null;
        await dbRun(
          `UPDATE participations 
           SET attendance_status = 'attended',
               achievement_level = ?,
               updated_at = datetime('now')
           WHERE activity_id = ? AND student_id = ?`,
          [achievementLevel, activity_id, studentId]
        );

        // Thêm bản ghi attendance_records nếu chưa có (schema chuẩn: recorded_by/method/recorded_at...)
        if (!existingRecord) {
          await dbRun(
            `INSERT INTO attendance_records (qr_session_id, activity_id, student_id, recorded_by, method, note, status)
             VALUES (NULL, ?, ?, ?, 'manual', NULL, 'recorded')`,
            [activity_id, studentId, user.id]
          );
          successCount++;
          results.push({ studentId, status: 'success', message: 'Điểm danh thành công' });
        } else {
          alreadyAttended++;
          results.push({
            studentId,
            status: 'already_attended',
            message: 'Đã điểm danh trước đó (đã cập nhật đánh giá nếu có)',
          });
        }

        // Theo business rule backbone hiện tại: attendance xác nhận tham gia,
        // scoring chính thức được chốt ở evaluation flow, không tính inline tại manual attendance.

        // Tạo thông báo (best-effort, không làm hỏng backbone attendance nếu notification lỗi cục bộ)
        try {
          await sendDatabaseNotification({
            userId: Number(studentId),
            type: 'success',
            title: 'Điểm danh thành công',
            message: `Bạn đã được điểm danh cho hoạt động "${activity.title}" (Điểm danh thủ công)`,
            relatedTable: 'activities',
            relatedId: Number(activity_id),
            dedupeWithinSeconds: 45,
          });
        } catch (notificationError) {
          console.error(
            `Failed to create notification for student ${studentId}:`,
            notificationError
          );
        }
      } catch (e) {
        console.error(`Failed to mark attendance for student ${studentId}:`, e);
        results.push({ studentId, status: 'error', message: 'Lỗi khi điểm danh' });
      }
    }

    // Log audit
    await dbRun(
      `INSERT INTO audit_logs (actor_id, action, target_table, target_id, details)
       VALUES (?, 'MANUAL_ATTENDANCE', 'attendance_records', ?, ?)`,
      [
        user.id,
        activity_id,
        `Điểm danh thủ công ${successCount} học viên cho hoạt động ${activity.title}`,
      ]
    );

    return successResponse(
      {
        successCount,
        alreadyAttended,
        results,
      },
      `Đã điểm danh ${successCount}/${student_ids.length} học viên`
    );
  } catch (error: any) {
    console.error('Manual attendance error:', error);
    return errorResponse(
      error instanceof ApiError ? error : ApiError.internalError('Lỗi khi điểm danh thủ công')
    );
  }
}

// GET /api/attendance/manual?activity_id=123 - Lấy danh sách học viên để điểm danh
export async function GET(request: NextRequest) {
  try {
    const user = await requireApiRole(request, ['admin', 'teacher']);

    const { searchParams } = new URL(request.url);
    const activityId = searchParams.get('activity_id');

    if (!activityId) {
      return errorResponse(ApiError.validation('Vui lòng cung cấp activity_id'));
    }

    const activity = await dbGet('SELECT id, teacher_id FROM activities WHERE id = ?', [
      activityId,
    ]);
    if (!activity) {
      return errorResponse(ApiError.notFound('Hoạt động không tồn tại'));
    }

    if (
      user.role === 'teacher' &&
      !(await teacherCanAccessActivity(Number(user.id), Number(activityId)))
    ) {
      return errorResponse(
        ApiError.forbidden('Bạn chỉ có thể xem danh sách điểm danh của hoạt động do mình phụ trách')
      );
    }

    // Lấy danh sách học viên đã đăng ký
    const students = await dbAll(
      `SELECT 
        u.id as user_id, u.name, u.email,
        p.attendance_status,
        p.achievement_level,
        ar.recorded_at as check_in_time,
        ar.method as check_in_method
      FROM participations p
      JOIN users u ON p.student_id = u.id
      LEFT JOIN attendance_records ar ON ar.activity_id = p.activity_id AND ar.student_id = p.student_id
      WHERE p.activity_id = ?
      ORDER BY u.name`,
      [activityId]
    );

    return successResponse({ students });
  } catch (error: any) {
    console.error('Get attendance list error:', error);
    return errorResponse(
      error instanceof ApiError ? error : ApiError.internalError('Lỗi khi lấy danh sách điểm danh')
    );
  }
}
