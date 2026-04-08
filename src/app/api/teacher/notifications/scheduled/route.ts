import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { dbAll } from '@/lib/database';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

// GET /api/teacher/notifications/scheduled
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return errorResponse(ApiError.unauthorized('Chưa đăng nhập'));

    const user = await getUserFromToken(token);
    if (!user || user.role !== 'teacher') {
      return errorResponse(ApiError.forbidden('Không có quyền truy cập'));
    }

    // Lấy danh sách thông báo đã lên lịch của giảng viên
    const notifications = await dbAll(
      `
      SELECT 
        id,
        title,
        message,
        JSON_ARRAY_LENGTH(student_ids) as recipient_count,
        scheduled_at,
        status,
        created_at
      FROM scheduled_notifications
      WHERE sender_id = ?
      ORDER BY scheduled_at DESC
      LIMIT 100
    `,
      [user.id]
    );

    return successResponse({ notifications: notifications || [] });
  } catch (error) {
    console.error('Lỗi lấy danh sách thông báo đã lên lịch:', error);
    return errorResponse(ApiError.internalError('Không thể lấy danh sách thông báo đã lên lịch'));
  }
}
