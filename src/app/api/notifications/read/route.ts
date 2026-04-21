import { NextRequest } from 'next/server';
import { dbRun } from '@/lib/database';
import { getUserFromToken } from '@/lib/auth';
import { apiHandler, ApiError, successResponse } from '@/lib/api-response';

// POST /api/notifications/read - Đánh dấu đã đọc
export const POST = apiHandler(async (request: NextRequest) => {
  const token = request.cookies.get('token')?.value;
  if (!token) throw ApiError.unauthorized('Chưa đăng nhập');

  const user = await getUserFromToken(token);
  if (!user) throw ApiError.unauthorized('Chưa đăng nhập');

  const { id, ids } = await request.json();

  const targetIds: number[] = [];
  if (id) {
    targetIds.push(Number(id));
  }
  if (Array.isArray(ids)) {
    targetIds.push(...ids.map(Number));
  }

  if (targetIds.length === 0) {
    throw ApiError.badRequest('Cần chỉ định id hoặc ids');
  }

  // Mark as read - only user's own notifications
  const placeholders = targetIds.map(() => '?').join(',');
  const result = await dbRun(
    `UPDATE notifications SET is_read = 1 WHERE id IN (${placeholders}) AND user_id = ?`,
    [...targetIds, user.id]
  );

  return successResponse({ marked: result.changes || 0 }, 'Đánh dấu đã đọc thành công');
});
