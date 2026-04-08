/**
 * API: Password Reset - Request Reset Token
 * POST /api/auth/password-reset/request
 *
 * User yêu cầu reset password - gửi OTP via QR hoặc email
 */

import { NextRequest, NextResponse } from 'next/server';
import { dbRun, dbGet } from '@/lib/database';
import crypto from 'crypto';

interface PasswordResetRequest {
  email: string;
}

// Generate 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: NextRequest) {
  try {
    const body: PasswordResetRequest = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Tìm user by email
    const user = await dbGet('SELECT id, email, full_name FROM users WHERE email = ?', [email]);

    if (!user) {
      // Security: Không reveal user existence
      return NextResponse.json({
        success: true,
        message: 'Nếu email tồn tại trong hệ thống, bạn sẽ nhận được liên kết reset',
      });
    }

    // Generate OTP token
    const otp = generateOTP();
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Lưu reset token vào DB
    await dbRun(
      `
      INSERT INTO password_reset_tokens (user_id, token, otp, expires_at)
      VALUES (?, ?, ?, ?)
    `,
      [user.id, token, otp, expiresAt.toISOString()]
    );

    // Hệ thống LAN nội bộ - không gửi email
    // OTP được trả về trong response để admin/user sử dụng
    console.warn(`✅ Password reset OTP for ${user.email}: ${otp}`);

    return NextResponse.json({
      success: true,
      message: 'OTP đã được tạo. Vui lòng sử dụng mã OTP dưới đây.',
      token,
      otp, // Always show OTP since we cannot send email
      method: 'local', // LAN only - no email
      expiresIn: 900, // seconds
    });
  } catch (error: any) {
    console.error('Error requesting password reset:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to request password reset' },
      { status: 500 }
    );
  }
}
