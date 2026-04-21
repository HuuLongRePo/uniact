import { NextRequest, NextResponse } from 'next/server';
import { dbAll, dbGet, dbRun } from '@/lib/database';
import { getUserFromToken } from '@/lib/auth';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

// GET /api/notifications - Lấy danh sách thông báo của user
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return errorResponse(ApiError.unauthorized('Chưa đăng nhập'));
    }

    const user = await getUserFromToken(token);
    if (!user) {
      return errorResponse(ApiError.unauthorized('Chưa đăng nhập'));
    }

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unread') === '1';
    const page = Math.max(Number(searchParams.get('page') || '1'), 1);
    const per_page = Math.min(Math.max(Number(searchParams.get('per_page') || '20'), 1), 100);
    const offset = (page - 1) * per_page;

    // Tạo table notifications nếu chưa có
    await dbRun(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        related_table TEXT,
        related_id INTEGER,
        is_read INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    let whereClause = 'WHERE user_id = ?';
    const params: any[] = [user.id];

    if (unreadOnly) {
      whereClause += ' AND is_read = 0';
    }

    // Get total count
    const totalRow = (await dbGet(
      `SELECT COUNT(*) as total FROM notifications ${whereClause}`,
      params
    )) as { total: number };

    // Get unread count
    const unreadRow = (await dbGet(
      'SELECT COUNT(*) as unread FROM notifications WHERE user_id = ? AND is_read = 0',
      [user.id]
    )) as { unread: number };

    // Get notifications
    const notifications = await dbAll(
      `SELECT * FROM notifications ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, per_page, offset]
    );

    return successResponse({
      notifications,
      meta: {
        total: totalRow.total,
        total_unread: unreadRow.unread,
        page,
        per_page,
      },
    });
  } catch (error: any) {
    console.error('Get notifications error:', error);
    return errorResponse(ApiError.internalError('Lỗi server'));
  }
}

// POST /api/notifications - Tạo thông báo mới (admin/teacher only)
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

    const { user_id, user_ids, type, title, message, related_table, related_id } =
      await request.json();

    if (!title || !message || !type) {
      return errorResponse(ApiError.validation('Thiếu thông tin bắt buộc'));
    }

    // Ensure table exists
    await dbRun(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        related_table TEXT,
        related_id INTEGER,
        is_read INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    const targetUserIds: number[] = [];
    if (user_id) {
      targetUserIds.push(user_id);
    }
    if (Array.isArray(user_ids)) {
      targetUserIds.push(...user_ids);
    }

    if (targetUserIds.length === 0) {
      return errorResponse(ApiError.validation('Cần chỉ định user_id hoặc user_ids'));
    }

    // Create notifications for each user
    let created = 0;
    for (const userId of targetUserIds) {
      await dbRun(
        `INSERT INTO notifications (user_id, type, title, message, related_table, related_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
        [userId, type, title, message, related_table || null, related_id || null]
      );
      created++;
    }

    return successResponse({ created }, `Đã tạo ${created} thông báo`, 201);
  } catch (error: any) {
    console.error('Create notification error:', error);
    return errorResponse(ApiError.internalError('Lỗi server'));
  }
}

// DELETE /api/notifications - Delete notifications
export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return errorResponse(ApiError.unauthorized('Chưa đăng nhập'));
    }

    const user = await getUserFromToken(token);
    if (!user) {
      return errorResponse(ApiError.unauthorized('Chưa đăng nhập'));
    }

    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get('id');
    const deleteAll = searchParams.get('all') === '1';

    if (!notificationId && !deleteAll) {
      return errorResponse(ApiError.validation('Cần cung cấp `id` hoặc `all=1` để xóa'));
    }

    let deletedCount = 0;

    if (deleteAll) {
      // Delete all notifications for current user
      const result = await dbRun('DELETE FROM notifications WHERE user_id = ?', [user.id]);
      deletedCount = result.changes || 0;
    } else {
      // Delete specific notification
      const notification = await dbGet('SELECT id, user_id FROM notifications WHERE id = ?', [
        parseInt(notificationId || '0'),
      ]);

      if (!notification) {
        return errorResponse(ApiError.notFound('Không tìm thấy thông báo'));
      }

      // User can only delete their own notifications
      if (notification.user_id !== user.id) {
        return errorResponse(ApiError.forbidden('Không có quyền truy cập'));
      }

      const result = await dbRun('DELETE FROM notifications WHERE id = ?', [notification.id]);
      deletedCount = result.changes || 0;
    }

    return successResponse(
      { deleted: deletedCount },
      deleteAll ? `Đã xóa toàn bộ ${deletedCount} thông báo` : `Đã xóa ${deletedCount} thông báo`
    );
  } catch (error: any) {
    console.error('Delete notification error:', error);
    return errorResponse(ApiError.internalError(error.message));
  }
}
