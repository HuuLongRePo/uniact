import { NextRequest, NextResponse } from 'next/server';
import { dbRun } from '@/lib/database';
import { getUserFromToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

// POST /api/auth/change-password
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return errorResponse(ApiError.unauthorized('Unauthorized'));
    }

    const user = await getUserFromToken(token);
    if (!user) {
      return errorResponse(ApiError.unauthorized('Unauthorized'));
    }

    const { current_password, new_password, confirm_password } = await request.json();

    if (!current_password || !new_password || !confirm_password) {
      return errorResponse(ApiError.validation('Vui lòng điền đầy đủ thông tin'));
    }

    if (new_password !== confirm_password) {
      return errorResponse(ApiError.validation('Mật khẩu mới không khớp'));
    }

    if (new_password.length < 6) {
      return errorResponse(ApiError.validation('Mật khẩu mới phải có ít nhất 6 ký tự'));
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(current_password, user.password_hash!);
    if (!isValidPassword) {
      return errorResponse(ApiError.validation('Mật khẩu hiện tại không đúng'));
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(new_password, 10);

    // Update password
    await dbRun('UPDATE users SET password_hash = ? WHERE id = ?', [hashedPassword, user.id]);

    // Log action
    await dbRun(
      `INSERT INTO audit_logs (actor_id, action, target_table, target_id, details, created_at)
       VALUES (?, 'UPDATE', 'users', ?, 'Đổi mật khẩu', datetime('now'))`,
      [user.id, user.id]
    );

    return successResponse({}, 'Đổi mật khẩu thành công');
  } catch (error: any) {
    console.error('Change password error:', error);
    return errorResponse(ApiError.internalError('Lỗi server'));
  }
}
