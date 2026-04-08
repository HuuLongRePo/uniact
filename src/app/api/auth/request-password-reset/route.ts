import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { dbGet, dbRun, dbReady } from '@/lib/database';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

// Send password reset email
async function sendPasswordResetEmail(email: string, token: string, userName: string) {
  try {
    // Mock email sending (in production would use nodemailer/SendGrid)
    console.warn(`📧 Password Reset Email Sent:
      To: ${email}
      User: ${userName}
      Token: ${token}
      Link: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${token}
    `);

    // Simulate email service
    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

    // Email body (HTML template)
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">UniAct - Đặt Lại Mật Khẩu</h2>
        <p>Xin chào <strong>${userName}</strong>,</p>
        <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
        <p>Nhấp vào liên kết bên dưới để đặt lại mật khẩu:</p>
        <p style="margin: 20px 0;">
          <a href="${resetLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Đặt Lại Mật Khẩu
          </a>
        </p>
        <p>Hoặc sao chép liên kết này vào trình duyệt:</p>
        <p style="word-break: break-all; color: #6b7280; font-size: 12px;">${resetLink}</p>
        <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="color: #6b7280; font-size: 12px;">
          Liên kết này sẽ hết hạn sau 1 giờ.<br>
          Nếu bạn không yêu cầu điều này, vui lòng bỏ qua email này.
        </p>
        <p style="color: #6b7280; font-size: 12px;">
          © 2024 UniAct - Hệ Thống Quản Lý Hoạt Động Ngoại Khóa
        </p>
      </div>
    `;

    // In production, this would send the actual email
    // await sendEmailViaService(email, 'UniAct - Đặt Lại Mật Khẩu', emailBody)

    return true;
  } catch (error) {
    console.error('Email sending error:', error);
    // Don't fail the whole request if email fails
    return false;
  }
}

// POST /api/auth/request-password-reset
// Body: { email: string }
// Always returns success message to avoid email enumeration.
export async function POST(request: NextRequest) {
  try {
    await dbReady();
    const { email } = await request.json();
    if (!email || typeof email !== 'string') {
      return errorResponse(ApiError.validation('Email không hợp lệ'));
    }

    // Tìm user (nếu không có vẫn trả success)
    const user = (await dbGet('SELECT id, name FROM users WHERE email = ?', [email])) as
      | { id?: number; name?: string }
      | undefined;

    if (user && user.id) {
      // Tạo token ngẫu nhiên
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 giờ

      await dbRun(
        'INSERT INTO password_reset_requests (user_id, token, expires_at) VALUES (?, ?, ?)',
        [user.id, token, expiresAt.toISOString()]
      );

      // Send email with reset link
      const userName = user.name || 'Người dùng';
      const emailSent = await sendPasswordResetEmail(email, token, userName);

      return successResponse(
        {
          reset_token: process.env.NODE_ENV !== 'production' ? token : undefined, // dev/test only
          email_sent: emailSent,
          expires_at: expiresAt.toISOString(),
        },
        'Nếu email tồn tại, yêu cầu đặt lại đã được tạo.'
      );
    }

    // Không tiết lộ email không tồn tại
    return successResponse({}, 'Nếu email tồn tại, yêu cầu đặt lại đã được tạo.');
  } catch (error: any) {
    console.error('Request password reset error:', error);
    return errorResponse(ApiError.internalError('Lỗi server'));
  }
}
