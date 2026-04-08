/**
 * API Route: Mark Notification as Read
 * PUT /api/notifications/[id]/read
 */

import { NextRequest } from 'next/server';
import { dbGet, dbRun, dbReady } from '@/lib/database';
import { getUserFromRequest } from '@/lib/guards';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await dbReady();

    const user = await getUserFromRequest(request);
    if (!user) {
      return errorResponse(ApiError.unauthorized('Unauthorized'));
    }

    const notificationId = parseInt(id);
    if (isNaN(notificationId)) {
      return errorResponse(ApiError.badRequest('ID không hợp lệ'));
    }

    // Check if notification exists and belongs to user
    const notification = (await dbGet('SELECT * FROM notifications WHERE id = ?', [
      notificationId,
    ])) as any;

    if (!notification) {
      // Try alerts table if notification doesn't exist
      const alert = (await dbGet('SELECT * FROM alerts WHERE id = ?', [notificationId])) as any;

      if (!alert) {
        return errorResponse(ApiError.notFound('Không tìm thấy thông báo'));
      }

      // Mark alert as read
      await dbRun('UPDATE alerts SET is_read = 1 WHERE id = ?', [notificationId]);

      return successResponse({}, 'Đã đánh dấu đã đọc');
    }

    // Verify ownership
    if (notification.user_id !== user.id && user.role !== 'admin') {
      return errorResponse(ApiError.forbidden('Bạn không có quyền đánh dấu thông báo này'));
    }

    // Mark as read
    await dbRun('UPDATE notifications SET is_read = 1 WHERE id = ?', [notificationId]);

    return successResponse({}, 'Đã đánh dấu đã đọc');
  } catch (error: any) {
    console.error('Mark notification as read error:', error);
    return errorResponse(ApiError.internalError('Lỗi server', { details: error?.message }));
  }
}
