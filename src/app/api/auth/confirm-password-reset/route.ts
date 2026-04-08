import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { dbGet, dbRun, dbReady } from '@/lib/database';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

// POST /api/auth/confirm-password-reset
// Body: { token: string, new_password: string }
export async function POST(request: NextRequest) {
  try {
    await dbReady();
    const { token, new_password } = await request.json();
    if (!token || typeof token !== 'string' || !new_password || typeof new_password !== 'string') {
      return errorResponse(ApiError.validation('Thiếu token hoặc mật khẩu mới'));
    }

    if (new_password.length < 6) {
      return errorResponse(ApiError.validation('Mật khẩu phải tối thiểu 6 ký tự'));
    }

    const reqRow = (await dbGet('SELECT * FROM password_reset_requests WHERE token = ?', [
      token,
    ])) as any;

    if (!reqRow) {
      return errorResponse(ApiError.validation('Token không hợp lệ'));
    }
    if (reqRow.used_at) {
      return errorResponse(ApiError.validation('Token đã được sử dụng'));
    }
    const now = Date.now();
    const exp = new Date(reqRow.expires_at).getTime();
    if (now > exp) {
      return errorResponse(ApiError.validation('Token đã hết hạn'));
    }

    // Băm mật khẩu mới
    const hash = await bcrypt.hash(new_password, 12);
    await dbRun('UPDATE users SET password_hash = ? WHERE id = ?', [hash, reqRow.user_id]);

    // Đánh dấu token đã dùng
    await dbRun('UPDATE password_reset_requests SET used_at = CURRENT_TIMESTAMP WHERE id = ?', [
      reqRow.id,
    ]);

    return successResponse({}, 'Đặt lại mật khẩu thành công');
  } catch (error: any) {
    console.error('Confirm password reset error:', error);
    return errorResponse(ApiError.internalError('Lỗi server'));
  }
}
