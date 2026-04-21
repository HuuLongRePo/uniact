import { NextRequest } from 'next/server';
import { requireApiRole } from '@/lib/guards';
import { rateLimit } from '@/lib/rateLimit';
import { dbRun, dbGet } from '@/lib/database';
import { ensureUserColumns } from '../../_utils';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = rateLimit(request, 20, 60 * 1000);
    if (!rl.allowed) {
      return errorResponse(new ApiError('RATE_LIMITED', 'Too many requests', 429));
    }

    const { id } = await params;
    const currentUser = await requireApiRole(request, ['admin']);

    await ensureUserColumns();

    const userId = parseInt(id);

    if (isNaN(userId)) {
      return errorResponse(ApiError.validation('ID người dùng không hợp lệ'));
    }

    // Cannot deactivate yourself
    if (userId === currentUser.id) {
      return errorResponse(ApiError.validation('Không thể vô hiệu hóa tài khoản của chính mình'));
    }

    const user = await dbGet('SELECT id, is_active FROM users WHERE id = ?', [userId]);
    if (!user) {
      return errorResponse(ApiError.notFound('Không tìm thấy người dùng'));
    }

    // Toggle status
    const newStatus = user.is_active ? 0 : 1;
    await dbRun('UPDATE users SET is_active = ? WHERE id = ?', [newStatus, userId]);

    await dbRun(
      `INSERT INTO audit_logs (actor_id, action, target_table, target_id, details, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [
        currentUser.id,
        newStatus ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
        'users',
        userId,
        JSON.stringify({ is_active: newStatus }),
      ]
    );

    return successResponse(
      { is_active: newStatus },
      newStatus ? 'Đã kích hoạt người dùng' : 'Đã vô hiệu hóa người dùng'
    );
  } catch (error) {
    console.error('Toggle user status error:', error);
    return errorResponse(
      error instanceof ApiError
        ? error
        : ApiError.internalError('Cập nhật trạng thái người dùng thất bại')
    );
  }
}
