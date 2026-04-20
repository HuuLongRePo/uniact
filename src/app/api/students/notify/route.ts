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

    const { student_ids, title, message, type = 'info' } = await request.json();

    // Validation
    if (!student_ids || !Array.isArray(student_ids) || student_ids.length === 0) {
      return errorResponse(ApiError.validation('Danh sách học viên không hợp lệ'));
    }

    if (!title || !message) {
      return errorResponse(ApiError.validation('Tiêu đề và nội dung không được trống'));
    }

    // Kiểm tra quyền: teacher chỉ gửi cho học viên trong lớp của mình
    if (user.role === 'teacher') {
      const managedStudentIds = await getTeacherManagedStudentIds(user.id);
      const invalidStudents = student_ids.filter(
        (studentId: unknown) => !managedStudentIds.includes(Number(studentId))
      );
      if (invalidStudents.length > 0) {
        return errorResponse(
          ApiError.forbidden('Bạn chỉ có thể gửi thông báo cho học viên trong lớp của mình')
        );
      }
    }

    const sendResult = await sendBulkDatabaseNotifications({
      userIds: student_ids,
      type,
      title,
      message,
      relatedTable: 'teacher_message',
      audit: {
        actorId: user.id,
        action: 'teacher_notify_students',
        targetTable: 'notifications',
        details: {
          recipient_count: student_ids.length,
          title,
          type,
        },
      },
    });

    const successCount = sendResult.created;

    return successResponse(
      { successCount },
      `Đã gửi thông báo cho ${successCount}/${student_ids.length} học viên`
    );
  } catch (error: any) {
    console.error('Lỗi gửi thông báo cho học viên:', error);
    return errorResponse(
      ApiError.internalError('Lỗi khi gửi thông báo', { details: error?.message })
    );
  }
}
