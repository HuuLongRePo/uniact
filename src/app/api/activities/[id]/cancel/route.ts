import { NextRequest } from 'next/server';
import { requireApiRole } from '@/lib/guards';
import { dbGet, dbRun } from '@/lib/database';
import { cache } from '@/lib/cache';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

// POST /api/activities/:id/cancel - Hủy hoạt động trước khi bắt đầu
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiRole(request, ['teacher', 'admin']);

    const { id } = await params;
    const activityId = Number(id);
    if (!activityId || Number.isNaN(activityId)) {
      return errorResponse(ApiError.validation('ID hoạt động không hợp lệ'));
    }

    const activity = await dbGet(
      'SELECT id, teacher_id, status, date_time FROM activities WHERE id = ?',
      [activityId]
    );
    if (!activity) {
      return errorResponse(ApiError.notFound('Không tìm thấy hoạt động'));
    }

    // Teacher chỉ được hủy hoạt động của mình
    if (user.role === 'teacher' && Number(activity.teacher_id) !== Number(user.id)) {
      return errorResponse(ApiError.forbidden('Bạn không phải người tạo hoạt động này'));
    }

    // Chỉ hủy nếu chưa bắt đầu
    const startsInHours = (new Date(activity.date_time).getTime() - Date.now()) / (1000 * 60 * 60);
    if (startsInHours < 0) {
      return errorResponse(ApiError.validation('Hoạt động đã bắt đầu hoặc đã kết thúc'));
    }

    // Only allow cancelling activities before start in valid states
    if (!['draft', 'published'].includes(activity.status)) {
      return errorResponse(
        ApiError.validation('Chỉ có thể hủy hoạt động ở trạng thái draft hoặc published')
      );
    }

    await dbRun('UPDATE activities SET status = "cancelled" WHERE id = ?', [activityId]);

    // Thông báo alert đơn giản cho giảng viên (self) hoặc admin
    await dbRun(
      `INSERT INTO alerts (level, message, related_table, related_id, is_read, created_at)
       VALUES ('warning', ?, 'activities', ?, 0, datetime('now'))`,
      [
        `Hoạt động ID ${activityId} đã được hủy bởi ${user.role === 'admin' ? 'Admin' : 'Giảng viên'}`,
        activityId,
      ]
    );

    // Invalidate cache activities
    cache.invalidatePrefix('activities:');

    return successResponse({ cancelled: true }, 'Đã hủy hoạt động');
  } catch (error: any) {
    console.error('Cancel activity error:', error);
    return errorResponse(ApiError.internalError('Lỗi máy chủ nội bộ'));
  }
}
