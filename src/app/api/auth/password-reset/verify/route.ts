/**
 * API: Password Reset - Verify OTP & Reset
 * POST /api/auth/password-reset/verify
 *
 * Verify OTP + new password
 */

import { NextRequest, NextResponse } from 'next/server';
import { dbRun, dbGet } from '@/lib/database';
import bcrypt from 'bcryptjs';

interface PasswordResetVerify {
  token: string;
  otp: string;
  new_password: string;
  confirm_password: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: PasswordResetVerify = await request.json();
    const { token, otp, new_password, confirm_password } = body;

    // Validate
    if (!token || !otp || !new_password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (new_password !== confirm_password) {
      return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 });
    }

    if (new_password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Tìm reset token
    const resetToken = await dbGet(
      `
      SELECT * FROM password_reset_tokens 
      WHERE token = ? AND otp = ? 
      AND expires_at > datetime('now')
    `,
      [token, otp]
    );

    if (!resetToken) {
      return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 });
    }

    // Hash password mới
    const hashedPassword = await bcrypt.hash(new_password, 12);

    // Update user password
    await dbRun('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
      hashedPassword,
      resetToken.user_id,
    ]);

    // Delete used token
    await dbRun('DELETE FROM password_reset_tokens WHERE id = ?', [resetToken.id]);

    // Audit log
    await dbRun(
      `
      INSERT INTO audit_logs (
        user_id,
        action,
        target_table,
        target_id,
        details
      ) VALUES (?, 'PASSWORD_RESET', 'users', ?, 'Self-service password reset')
    `,
      [resetToken.user_id, resetToken.user_id]
    );

    return NextResponse.json({
      success: true,
      message: 'Mật khẩu đã được cập nhật thành công. Vui lòng đăng nhập lại.',
    });
  } catch (error: any) {
    console.error('Error verifying password reset:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to reset password' },
      { status: 500 }
    );
  }
}
