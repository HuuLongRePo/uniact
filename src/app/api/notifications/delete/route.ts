import { NextRequest } from 'next/server';
import { getUserFromSession } from '@/lib/auth';
import { dbRun } from '@/lib/database';
import { apiHandler, ApiError, successResponse } from '@/lib/api-response';

export const DELETE = apiHandler(async (request: NextRequest) => {
  const user = await getUserFromSession();
  if (!user) throw ApiError.unauthorized('Chưa đăng nhập');

  const { ids } = await request.json();

  if (!Array.isArray(ids) || ids.length === 0) {
    throw ApiError.badRequest('Yêu cầu không hợp lệ');
  }

  // Delete notifications
  const placeholders = ids.map(() => '?').join(',');
  await dbRun(`DELETE FROM notifications WHERE id IN (${placeholders}) AND user_id = ?`, [
    ...ids,
    user.id,
  ]);

  return successResponse({}, 'Đã xóa thông báo thành công');
});
