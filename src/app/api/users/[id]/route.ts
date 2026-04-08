import { NextRequest } from 'next/server';
import { dbGet, dbRun } from '@/lib/database';
import { getUserFromToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

// GET /api/users/:id - Lấy thông tin người dùng
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return errorResponse(ApiError.unauthorized('Chưa đăng nhập'));
    }

    const currentUser = await getUserFromToken(token);
    if (!currentUser) {
      return errorResponse(ApiError.unauthorized('Chưa đăng nhập'));
    }

    const userId = id === 'me' ? currentUser.id : parseInt(id);

    // Only admin or self can view
    if (currentUser.role !== 'admin' && currentUser.id !== userId) {
      return errorResponse(ApiError.forbidden('Không có quyền truy cập'));
    }

    const user = await dbGet(
      `SELECT 
        u.id,
        u.email,
        u.name,
        u.role,
        u.avatar_url,
        u.class_id,
        u.created_at,
        c.name as class_name,
        (SELECT COUNT(*) FROM participations WHERE student_id = u.id) as activity_count,
        (SELECT SUM(points) FROM student_scores WHERE student_id = u.id) as total_points
      FROM users u
      LEFT JOIN classes c ON u.class_id = c.id
      WHERE u.id = ?`,
      [userId]
    );

    if (!user) {
      return errorResponse(ApiError.notFound('Không tìm thấy người dùng'));
    }

    // Ẩn citizen_id nếu user tự xem (chỉ admin/teacher mới thấy)
    const response: any = { ...user };
    if (currentUser.role === 'student' && currentUser.id === userId) {
      delete response.citizen_id;
    }

    return successResponse({ user: response });
  } catch (error: any) {
    console.error('Lỗi lấy thông tin người dùng:', error);
    return errorResponse(ApiError.internalError('Lỗi máy chủ'));
  }
}

// PUT /api/users/:id - Cập nhật thông tin người dùng
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return errorResponse(ApiError.unauthorized('Chưa đăng nhập'));
    }

    const currentUser = await getUserFromToken(token);
    if (!currentUser) {
      return errorResponse(ApiError.unauthorized('Chưa đăng nhập'));
    }

    const userId = id === 'me' ? currentUser.id : parseInt(id);

    // Only admin or self can update
    if (currentUser.role !== 'admin' && currentUser.id !== userId) {
      return errorResponse(ApiError.forbidden('Không có quyền truy cập'));
    }

    const {
      name,
      email,
      role,
      class_id,
      avatar_url,
      gender,
      date_of_birth,
      citizen_id,
      province,
      district,
      ward,
      address_detail,
    } = await request.json();

    // Check user exists
    const user = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      return errorResponse(ApiError.notFound('Không tìm thấy người dùng'));
    }

    // Only admin can change role
    if (role && role !== user.role && currentUser.role !== 'admin') {
      return errorResponse(ApiError.forbidden('Không có quyền thay đổi vai trò'));
    }

    // Build update query
    const updates: string[] = [];
    const updateParams: any[] = [];

    if (name) {
      updates.push('name = ?');
      updateParams.push(name);
    }
    if (email && email !== user.email) {
      // Check email unique
      const existingEmail = await dbGet('SELECT id FROM users WHERE email = ? AND id != ?', [
        email,
        userId,
      ]);
      if (existingEmail) {
        return errorResponse(ApiError.badRequest('Email đã được sử dụng'));
      }
      updates.push('email = ?');
      updateParams.push(email);
    }
    if (role && currentUser.role === 'admin') {
      updates.push('role = ?');
      updateParams.push(role);
    }
    if (class_id !== undefined) {
      updates.push('class_id = ?');
      updateParams.push(class_id);
    }
    if (avatar_url !== undefined) {
      updates.push('avatar_url = ?');
      updateParams.push(avatar_url);
    }
    if (gender !== undefined) {
      updates.push('gender = ?');
      updateParams.push(gender);
    }
    if (date_of_birth !== undefined) {
      updates.push('date_of_birth = ?');
      updateParams.push(date_of_birth);
    }
    // Chỉ admin/teacher mới được cập nhật citizen_id (student không được tự sửa)
    if (
      citizen_id !== undefined &&
      (currentUser.role === 'admin' || currentUser.role === 'teacher')
    ) {
      updates.push('citizen_id = ?');
      updateParams.push(citizen_id);
    }
    if (province !== undefined) {
      updates.push('province = ?');
      updateParams.push(province);
    }
    if (district !== undefined) {
      updates.push('district = ?');
      updateParams.push(district);
    }
    if (ward !== undefined) {
      updates.push('ward = ?');
      updateParams.push(ward);
    }
    if (address_detail !== undefined) {
      updates.push('address_detail = ?');
      updateParams.push(address_detail);
    }

    if (updates.length === 0) {
      return errorResponse(ApiError.badRequest('Không có gì để cập nhật'));
    }

    updateParams.push(userId);

    await dbRun(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, updateParams);

    // Log action
    await dbRun(
      `INSERT INTO audit_logs (actor_id, action, target_table, target_id, details, created_at)
       VALUES (?, 'UPDATE', 'users', ?, ?, datetime('now'))`,
      [currentUser.id, userId, `Cập nhật thông tin người dùng: ${name || user.name}`]
    );

    return successResponse({}, 'Cập nhật thành công');
  } catch (error: any) {
    console.error('Lỗi cập nhật người dùng:', error);
    return errorResponse(ApiError.internalError('Lỗi máy chủ'));
  }
}

// DELETE /api/users/:id - Xóa người dùng (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return errorResponse(ApiError.unauthorized('Chưa đăng nhập'));
    }

    const currentUser = await getUserFromToken(token);
    if (!currentUser || currentUser.role !== 'admin') {
      return errorResponse(ApiError.forbidden('Không có quyền truy cập (chỉ admin)'));
    }

    const userId = parseInt(id);

    // Cannot delete self
    if (userId === currentUser.id) {
      return errorResponse(ApiError.badRequest('Không thể xóa chính mình'));
    }

    // Check user exists
    const user = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      return errorResponse(ApiError.notFound('Không tìm thấy người dùng'));
    }

    // Soft delete: could also hard delete
    await dbRun('DELETE FROM users WHERE id = ?', [userId]);

    // Log action
    await dbRun(
      `INSERT INTO audit_logs (actor_id, action, target_table, target_id, details, created_at)
       VALUES (?, 'DELETE', 'users', ?, ?, datetime('now'))`,
      [currentUser.id, userId, `Xóa người dùng: ${user.name} (${user.email})`]
    );

    return successResponse({}, 'Xóa người dùng thành công');
  } catch (error: any) {
    console.error('Lỗi xoá người dùng:', error);
    return errorResponse(ApiError.internalError('Lỗi máy chủ'));
  }
}
