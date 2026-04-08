import { NextRequest } from 'next/server';
import { dbGet, dbRun, dbHelpers } from '@/lib/database';
import { getUserFromToken } from '@/lib/auth';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

// PUT /api/users/[id]/move-class - Chuyển học viên sang lớp khác (chỉ Admin)
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
    if (!userId || isNaN(userId)) {
      return errorResponse(ApiError.badRequest('ID người dùng không hợp lệ'));
    }

    const { new_class_id, reason } = await request.json();

    const newClassId = new_class_id ? parseInt(new_class_id) : null;

    // Verify student exists and is a student
    const student = await dbGet('SELECT id, name, email, role, class_id FROM users WHERE id = ?', [
      userId,
    ]);

    if (!student) {
      return errorResponse(ApiError.notFound('Không tìm thấy người dùng'));
    }

    if (student.role !== 'student') {
      return errorResponse(ApiError.badRequest('Chỉ có thể chuyển lớp đối với học viên'));
    }

    // Get old class info
    let oldClassName = 'Không có lớp';
    if (student.class_id) {
      const oldClass = await dbGet('SELECT name FROM classes WHERE id = ?', [student.class_id]);
      oldClassName = oldClass?.name || `Lớp ${student.class_id}`;
    }

    // If new class specified, verify it exists
    let newClassName = 'Không có lớp';
    if (newClassId) {
      const newClass = await dbGet('SELECT name FROM classes WHERE id = ?', [newClassId]);

      if (!newClass) {
        return errorResponse(ApiError.notFound('Không tìm thấy lớp mới'));
      }

      newClassName = newClass.name;
    }

    // Check if already in target class
    if (student.class_id === newClassId) {
      return errorResponse(ApiError.conflict('Học viên đã ở trong lớp này'));
    }

    // Update student's class
    await dbRun('UPDATE users SET class_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
      newClassId,
      userId,
    ]);

    // Create audit log
    await dbHelpers.createAuditLog(
      currentUser.id,
      'MOVE_CLASS',
      'users',
      userId,
      JSON.stringify({
        student_name: student.name,
        student_email: student.email,
        old_class_id: student.class_id,
        old_class_name: oldClassName,
        new_class_id: newClassId,
        new_class_name: newClassName,
        reason: reason || 'Không có lý do',
        moved_by: currentUser.email,
      })
    );

    return successResponse(
      {
        student_id: userId,
        student_name: student.name,
        old_class: oldClassName,
        new_class: newClassName,
      },
      `Đã chuyển ${student.name} từ "${oldClassName}" sang "${newClassName}"`
    );
  } catch (error) {
    console.error('Lỗi chuyển lớp:', error);
    return errorResponse(ApiError.internalError('Không thể chuyển lớp cho học viên'));
  }
}
