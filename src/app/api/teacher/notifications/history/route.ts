import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { dbAll } from '@/lib/database';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

// GET /api/teacher/notifications/history
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return errorResponse(ApiError.unauthorized('Chưa đăng nhập'));

    const user = await getUserFromToken(token);
    if (!user || user.role !== 'teacher') {
      return errorResponse(ApiError.forbidden('Không có quyền truy cập'));
    }

    // Fetch sent notifications by this teacher
    const notifications = await dbAll(
      `
      SELECT 
        n.id,
        n.title,
        n.message,
        COUNT(nr.id) as recipient_count,
        SUM(CASE WHEN nr.read_at IS NOT NULL THEN 1 ELSE 0 END) as read_count,
        n.created_at,
        n.updated_at
      FROM notifications n
      LEFT JOIN notification_recipients nr ON nr.notification_id = n.id
      WHERE n.sender_id = ?
      GROUP BY n.id
      ORDER BY n.created_at DESC
      LIMIT 100
    `,
      [user.id]
    );

    return successResponse({ notifications: notifications || [] });
  } catch (error) {
    console.error('Lỗi lấy lịch sử thông báo:', error);
    return errorResponse(ApiError.internalError('Không thể lấy lịch sử thông báo'));
  }
}
