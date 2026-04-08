import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { dbRun, dbGet } from '@/lib/database';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

// DELETE /api/teacher/notifications/scheduled/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.cookies.get('token')?.value;
    if (!token) return errorResponse(ApiError.unauthorized('Chưa đăng nhập'));

    const user = await getUserFromToken(token);
    if (!user || user.role !== 'teacher') {
      return errorResponse(ApiError.forbidden('Không có quyền truy cập'));
    }

    // Verify ownership
    const notification = await dbGet('SELECT sender_id FROM scheduled_notifications WHERE id = ?', [
      id,
    ]);

    if (!notification) {
      return errorResponse(ApiError.notFound('Không tìm thấy thông báo'));
    }

    if (notification.sender_id !== user.id) {
      return errorResponse(ApiError.forbidden('Không có quyền truy cập'));
    }

    // Delete the notification
    await dbRun('DELETE FROM scheduled_notifications WHERE id = ?', [id]);

    return successResponse({}, 'Đã hủy thông báo');
  } catch (error) {
    console.error('Lỗi hủy thông báo đã lên lịch:', error);
    return errorResponse(ApiError.internalError('Không thể hủy thông báo'));
  }
}
