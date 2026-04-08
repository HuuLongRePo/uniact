import { NextRequest } from 'next/server';
import { dbGet, dbRun } from '@/lib/database';
import bcrypt from 'bcryptjs';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import { requireApiRole } from '@/lib/guards';

// POST /api/users/:id/reset-password - Reset mật khẩu người dùng (Admin only)
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const currentUser = await requireApiRole(request, ['admin']);

    const userId = parseInt(id);

    // Kiểm tra user tồn tại
    const user = await dbGet('SELECT id, email, name, role FROM users WHERE id = ?', [userId]);

    if (!user) {
      return errorResponse(ApiError.notFound('Không tìm thấy người dùng'));
    }

    // Generate random password (8 ký tự: chữ + số)
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    let newPassword = '';
    for (let i = 0; i < 8; i++) {
      newPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update database
    await dbRun('UPDATE users SET password_hash = ? WHERE id = ?', [hashedPassword, userId]);

    // Audit log
    await dbRun(
      `INSERT INTO audit_logs (actor_id, action, target_table, target_id, details, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [
        currentUser.id,
        'RESET_PASSWORD',
        'users',
        userId,
        JSON.stringify({
          admin_id: currentUser.id,
          admin_name: currentUser.name,
          target_user_email: user.email,
          target_user_name: user.name,
        }),
      ]
    );

    return successResponse(
      {
        user_id: userId,
        email: user.email,
        name: user.name,
        new_password: newPassword, // Trả về password để admin có thể copy
      },
      'Đã reset mật khẩu thành công'
    );
  } catch (error) {
    console.error('Error resetting password:', error);
    return errorResponse(ApiError.internalError('Failed to reset password'));
  }
}
