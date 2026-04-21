import { NextRequest, NextResponse } from 'next/server';
import { dbAll } from '@/lib/database';
import { getUserFromToken } from '@/lib/auth';
import { ApiError, successResponse, errorResponse } from '@/lib/api-response';
import { getTeacherManagedStudentIds, sendBulkDatabaseNotifications } from '@/lib/notifications';

// POST /api/students/notify - Gửi thông báo cho học viên
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return errorResponse(ApiError.unauthorized('Chưa đăng nhập'));
    }

    const user = await getUserFromToken(token);
    if (!user || (user.role !== 'admin' && user.role !== 'teacher')) {
      return errorResponse(ApiError.forbidden('Không có quyền truy cập'));
    }

    const { student_ids, class_ids, title, message, type = 'info' } = await request.json();

    const normalizedStudentIds = Array.isArray(student_ids)
      ? student_ids
          .map((id: unknown) => Number(id))
          .filter((id: number) => Number.isInteger(id) && id > 0)
      : [];
    const normalizedClassIds = Array.isArray(class_ids)
      ? class_ids
          .map((id: unknown) => Number(id))
          .filter((id: number) => Number.isInteger(id) && id > 0)
      : [];

    const classStudentIds =
      normalizedClassIds.length > 0
        ? (
            (await dbAll(
              `SELECT id
               FROM users
               WHERE role = 'student'
                 AND COALESCE(is_active, 1) = 1
                 AND class_id IN (${normalizedClassIds.map(() => '?').join(',')})`,
              normalizedClassIds
            )) as Array<{ id: number }>
          )
            .map((row) => Number(row.id))
            .filter((id) => Number.isInteger(id) && id > 0)
        : [];

    const targetStudentIds = Array.from(new Set([...normalizedStudentIds, ...classStudentIds]));

    // Validation
    if (targetStudentIds.length === 0) {
      return errorResponse(ApiError.validation('Danh sách học viên không hợp lệ'));
    }

    if (!title || !message) {
      return errorResponse(ApiError.validation('Tiêu đề và nội dung không được trống'));
    }

    // Kiểm tra quyền: teacher chỉ gửi cho học viên trong lớp của mình
    if (user.role === 'teacher') {
      const managedStudentIds = await getTeacherManagedStudentIds(user.id);
      const managedStudentSet = new Set(managedStudentIds.map((id) => Number(id)));
      const invalidStudents = targetStudentIds.filter(
        (studentId: number) => !managedStudentSet.has(studentId)
      );
      if (invalidStudents.length > 0) {
        return errorResponse(
          ApiError.forbidden('Bạn chỉ có thể gửi thông báo cho học viên trong lớp của mình')
        );
      }
    }

    const sendResult = await sendBulkDatabaseNotifications({
      userIds: targetStudentIds,
      type,
      title,
      message,
      relatedTable: 'teacher_message',
      audit: {
        actorId: user.id,
        action: 'teacher_notify_students',
        targetTable: 'notifications',
        details: {
          recipient_count: targetStudentIds.length,
          class_ids: normalizedClassIds,
          title,
          type,
        },
      },
    });

    const successCount = sendResult.created;

    return successResponse(
      { successCount },
      `Đã gửi thông báo cho ${successCount}/${targetStudentIds.length} học viên`
    );
  } catch (error: any) {
    console.error('Lỗi gửi thông báo cho học viên:', error);
    return errorResponse(
      ApiError.internalError('Lỗi khi gửi thông báo', { details: error?.message })
    );
  }
}
