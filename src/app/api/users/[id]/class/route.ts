import { NextRequest } from 'next/server';
import { dbGet, dbRun } from '@/lib/database';
import { getUserFromToken } from '@/lib/auth';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

// PUT /api/users/:id/class - Chuyển học viên sang lớp khác (Admin only)
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    const body = await request.json();
    const { class_id } = body;

    if (!class_id) {
      return errorResponse(ApiError.badRequest('Thiếu class_id'));
    }

    // Kiểm tra user tồn tại và là student
    const user = await dbGet(
      `SELECT u.id, u.name, u.role, u.class_id, c.name as current_class_name 
       FROM users u 
       LEFT JOIN classes c ON u.class_id = c.id 
       WHERE u.id = ?`,
      [userId]
    );

    if (!user) {
      return errorResponse(ApiError.notFound('Không tìm thấy người dùng'));
    }

    if (user.role !== 'student') {
      return errorResponse(ApiError.badRequest('Chỉ có thể chuyển lớp cho học viên'));
    }

    // Kiểm tra lớp mới tồn tại
    const newClass = await dbGet('SELECT id, name FROM classes WHERE id = ?', [class_id]);

    if (!newClass) {
      return errorResponse(ApiError.notFound('Không tìm thấy lớp mới'));
    }

    // Kiểm tra không trùng lớp cũ
    if (user.class_id === class_id) {
      return errorResponse(
        ApiError.badRequest('Học viên đã ở lớp này rồi', { current_class: user.current_class_name })
      );
    }

    // Update class
    await dbRun('UPDATE users SET class_id = ? WHERE id = ?', [class_id, userId]);

    // Audit log
    await dbRun(
      `INSERT INTO audit_logs (actor_id, action, target_table, target_id, details, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [
        currentUser.id,
        'MOVE_STUDENT_CLASS',
        'users',
        userId,
        JSON.stringify({
          admin_id: currentUser.id,
          admin_name: currentUser.name,
          student_id: userId,
          student_name: user.name,
          old_class_id: user.class_id,
          old_class_name: user.current_class_name,
          new_class_id: class_id,
          new_class_name: newClass.name,
        }),
      ]
    );

    return successResponse(
      {
        user_id: userId,
        user_name: user.name,
        old_class: {
          id: user.class_id,
          name: user.current_class_name,
        },
        new_class: {
          id: newClass.id,
          name: newClass.name,
        },
      },
      'Chuyển lớp thành công'
    );
  } catch (error) {
    console.error('Error moving student:', error);
    return errorResponse(ApiError.internalError('Không thể chuyển lớp học viên'));
  }
}
