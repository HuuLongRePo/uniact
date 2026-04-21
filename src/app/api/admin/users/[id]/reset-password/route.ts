import { NextRequest } from 'next/server';
import { requireApiRole } from '@/lib/guards';
import { rateLimit } from '@/lib/rateLimit';
import { dbRun, dbGet } from '@/lib/database';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// POST /api/admin/users/[id]/reset-password - Reset user password
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = rateLimit(request, 20, 60 * 1000);
    if (!rl.allowed) {
      return errorResponse(new ApiError('RATE_LIMITED', 'Quá nhiều yêu cầu', 429));
    }

    const { id } = await params;
    const userId = parseInt(id, 10);
    if (Number.isNaN(userId)) {
      return errorResponse(ApiError.validation('ID người dùng không hợp lệ'));
    }
    const user = await requireApiRole(request, ['admin']);

    const existing = await dbGet('SELECT id FROM users WHERE id = ?', [userId]);
    if (!existing) {
      return errorResponse(ApiError.notFound('Không tìm thấy người dùng'));
    }

    // Generate a random temporary password (8 characters)
    const temporaryPassword = crypto.randomBytes(4).toString('hex');
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    // Update user password
    await dbRun('UPDATE users SET password_hash = ? WHERE id = ?', [hashedPassword, userId]);

    // Log the action
    await dbRun(
      `INSERT INTO audit_logs (actor_id, action, target_table, target_id, details, created_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        user.id,
        'RESET_PASSWORD',
        'users',
        userId,
        `Admin ${user.name || user.email} reset password for user ID ${userId}`,
      ]
    );

    return successResponse(
      {
        new_password: temporaryPassword,
        note: 'Vui lòng gửi mật khẩu tạm thời này cho người dùng và yêu cầu họ đổi mật khẩu sau khi đăng nhập',
      },
      'Mật khẩu đã được đặt lại'
    );
  } catch (error: any) {
    console.error('Error resetting password:', error);
    const apiError =
      error instanceof ApiError
        ? error
        : error instanceof Error &&
            typeof (error as any).status === 'number' &&
            typeof (error as any).code === 'string'
          ? new ApiError(
              (error as any).code,
              error.message,
              (error as any).status,
              (error as any).details
            )
          : ApiError.internalError(error?.message || 'Không thể đặt lại mật khẩu');

    return errorResponse(apiError);
  }
}
