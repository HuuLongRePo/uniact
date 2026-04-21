import { NextRequest } from 'next/server';
import { dbGet, dbRun, dbHelpers } from '@/lib/database';
import { getUserFromToken } from '@/lib/auth';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

// PUT /api/users/:id/role - Thay đổi role của user (Admin only)
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return errorResponse(ApiError.unauthorized('Chưa đăng nhập'));
    }

    const currentUser = await getUserFromToken(token);
    if (!currentUser || currentUser.role !== 'admin') {
      return errorResponse(ApiError.forbidden('Chỉ admin mới có quyền thay đổi role người dùng'));
    }

    const userId = parseInt(id);
    const { role, reason } = await request.json();

    // Validate role
    if (!['admin', 'teacher', 'student'].includes(role)) {
      return errorResponse(
        ApiError.badRequest('Role không hợp lệ. Chỉ cho phép: admin, teacher, student')
      );
    }

    // Check user exists
    const user = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      return errorResponse(ApiError.notFound('Không tìm thấy người dùng'));
    }

    // Prevent self-demotion (admin cannot change own role)
    if (currentUser.id === userId) {
      return errorResponse(ApiError.badRequest('Không thể thay đổi role của chính bạn'));
    }

    // Prevent last admin from being demoted
    if (user.role === 'admin' && role !== 'admin') {
      const adminCount = await dbGet('SELECT COUNT(*) as count FROM users WHERE role = ?', [
        'admin',
      ]);
      if (adminCount.count <= 1) {
        return errorResponse(
          ApiError.badRequest('Không thể thay đổi role của admin cuối cùng trong hệ thống')
        );
      }
    }

    const oldRole = user.role;

    // Update role
    await dbRun('UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
      role,
      userId,
    ]);

    // Create audit log
    await dbHelpers.createAuditLog(
      currentUser.id,
      'CHANGE_USER_ROLE',
      'users',
      userId,
      JSON.stringify({
        old_role: oldRole,
        new_role: role,
        reason: reason || 'Không có lý do',
        user_email: user.email,
        user_name: user.name,
      })
    );

    // Get updated user
    const updatedUser = await dbGet(
      `SELECT 
        u.id, u.email, u.name, u.role, u.avatar_url, u.class_id, u.created_at,
        c.name as class_name
      FROM users u
      LEFT JOIN classes c ON u.class_id = c.id
      WHERE u.id = ?`,
      [userId]
    );

    return successResponse({ user: updatedUser }, `Đã thay đổi role từ ${oldRole} thành ${role}`);
  } catch (error: any) {
    console.error('Change role error:', error);
    return errorResponse(
      ApiError.internalError('Lỗi khi thay đổi role', { details: error?.message })
    );
  }
}
