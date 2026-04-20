import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { dbRun } from '@/lib/database';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import { ensureScheduledNotificationsTable, getTeacherManagedStudentIds } from '@/lib/notifications';

// POST /api/teacher/notifications/schedule
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return errorResponse(ApiError.unauthorized('Chưa đăng nhập'));

    const user = await getUserFromToken(token);
    if (!user || user.role !== 'teacher') {
      return errorResponse(ApiError.forbidden('Không có quyền truy cập'));
    }

    const body = await request.json();
    const { student_ids, title, message, scheduled_at } = body;

    if (!student_ids || !title || !message || !scheduled_at) {
      return errorResponse(ApiError.validation('Thiếu trường bắt buộc'));
    }

    const normalizedStudentIds = Array.from(
      new Set(
        (Array.isArray(student_ids) ? student_ids : [])
          .map((value) => Number(value))
          .filter((value) => Number.isInteger(value) && value > 0)
      )
    );

    if (normalizedStudentIds.length === 0) {
      return errorResponse(ApiError.validation('Danh sách học viên không hợp lệ'));
    }

    const managedStudentIds = await getTeacherManagedStudentIds(user.id);
    const invalidStudentIds = normalizedStudentIds.filter((studentId) => !managedStudentIds.includes(studentId));
    if (invalidStudentIds.length > 0) {
      return errorResponse(ApiError.forbidden('Bạn chỉ có thể lên lịch thông báo cho học viên trong phạm vi quản lý'));
    }

    await ensureScheduledNotificationsTable();

    // Create scheduled notification record
    const result = await dbRun(
      `
      INSERT INTO scheduled_notifications (
        sender_id, title, message, student_ids, scheduled_at, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
      [
        user.id,
        title,
        message,
        JSON.stringify(normalizedStudentIds),
        scheduled_at,
        'pending',
        new Date().toISOString(),
      ]
    );

    return successResponse({ notification_id: result.lastID }, 'Thông báo đã được lên lịch');
  } catch (error) {
    console.error('Lỗi lên lịch thông báo:', error);
    return errorResponse(ApiError.internalError('Không thể lên lịch thông báo'));
  }
}
