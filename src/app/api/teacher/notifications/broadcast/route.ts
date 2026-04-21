import { NextRequest } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import {
  getManagedActivityParticipantIds,
  getTeacherManagedStudentIds,
  sendBulkDatabaseNotifications,
} from '@/lib/notifications';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return errorResponse(ApiError.unauthorized('Chưa đăng nhập'));
    }

    const user = await getUserFromToken(token);
    if (!user || user.role !== 'teacher') {
      return errorResponse(ApiError.forbidden('Không có quyền truy cập'));
    }

    const body = await request.json().catch(() => ({}));
    const scope = String(body?.scope || '').trim();
    const title = String(body?.title || '').trim();
    const message = String(body?.message || '').trim();
    const activityIds = Array.isArray(body?.activity_ids) ? body.activity_ids.map(Number) : [];

    if (!title || !message) {
      return errorResponse(ApiError.validation('Vui lòng nhập tiêu đề và nội dung'));
    }

    let recipientIds: number[] = [];

    if (scope === 'managed_activities') {
      recipientIds = await getManagedActivityParticipantIds(user.id, activityIds);
      if (recipientIds.length === 0) {
        return errorResponse(
          ApiError.validation('Không có học viên tham gia hoạt động phù hợp để gửi thông báo')
        );
      }
    } else if (scope === 'homeroom_classes') {
      recipientIds = await getTeacherManagedStudentIds(user.id);
      if (recipientIds.length === 0) {
        return errorResponse(
          ApiError.validation('Không tìm thấy học viên thuộc lớp bạn phụ trách')
        );
      }
    } else {
      return errorResponse(ApiError.validation('Phạm vi broadcast không hợp lệ'));
    }

    const result = await sendBulkDatabaseNotifications({
      userIds: recipientIds,
      type: 'broadcast',
      title,
      message,
      relatedTable: 'teacher_broadcast',
      audit: {
        actorId: user.id,
        action: 'teacher_broadcast_notification',
        targetTable: 'notifications',
        details: {
          scope,
          activity_ids: activityIds,
          recipient_count: recipientIds.length,
          title,
        },
      },
    });

    return successResponse(
      {
        recipient_count: result.created,
        scope,
      },
      `Đã gửi thông báo cho ${result.created} học viên`
    );
  } catch (error: any) {
    console.error('Teacher broadcast route error:', error);
    return errorResponse(
      error instanceof ApiError
        ? error
        : ApiError.internalError('Không thể gửi broadcast thông báo', { details: error?.message })
    );
  }
}
