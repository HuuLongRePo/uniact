import { NextRequest } from 'next/server';
import { getUserFromSession } from '@/lib/auth';
import { dbRun, dbGet } from '@/lib/database';
import { ApiError, successResponse, errorResponse } from '@/lib/api-response';

/**
 * DELETE /api/admin/classes/[id]/students/[studentId]
 * Xóa một học viên khỏi lớp
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; studentId: string }> }
) {
  try {
    const { id: classId, studentId } = await params;
    const user = await getUserFromSession();

    if (!user) return errorResponse(ApiError.unauthorized('Chưa xác thực'));
    if (user.role !== 'admin')
      return errorResponse(ApiError.forbidden('Không có quyền truy cập'));

    // Verify class exists
    const classData = await dbGet('SELECT id, name FROM classes WHERE id = ?', [classId]);
    if (!classData) {
      return errorResponse(ApiError.notFound('Lớp học không tồn tại'));
    }

    // Verify student exists và đang trong lớp này
    const student = await dbGet('SELECT id, name, class_id FROM users WHERE id = ? AND role = ?', [
      studentId,
      'student',
    ]);

    if (!student) {
      return errorResponse(ApiError.notFound('Học viên không tồn tại'));
    }

    if (student.class_id !== parseInt(classId)) {
      return errorResponse(
        ApiError.validation(`Học viên ${student.name} không thuộc lớp ${classData.name}`)
      );
    }

    // Remove student from class (set class_id to NULL)
    await dbRun('UPDATE users SET class_id = NULL WHERE id = ?', [studentId]);

    return successResponse(
      {
        student_id: studentId,
        student_name: student.name,
        class_name: classData.name,
      },
      `Đã xóa học viên ${student.name} khỏi lớp ${classData.name}`
    );
  } catch (error: any) {
    console.error('Error removing student from class:', error);
    return errorResponse(ApiError.internalError(error.message || 'Lỗi khi xóa học viên khỏi lớp'));
  }
}
