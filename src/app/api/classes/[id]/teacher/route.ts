import { NextRequest } from 'next/server';
import { requireRole } from '@/lib/guards';
import { dbGet, dbRun } from '@/lib/database';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

// PUT /api/classes/[id]/teacher - Assign/Change teacher for class
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    let user;
    try {
      user = await requireRole(request, ['admin']);
    } catch (err: any) {
      const message = String(err?.message || '');
      return errorResponse(
        message.includes('Không có quyền')
          ? ApiError.forbidden('Không có quyền truy cập')
          : ApiError.unauthorized('Chưa đăng nhập')
      );
    }

    const classId = Number(id);
    if (!classId || Number.isNaN(classId)) {
      return errorResponse(ApiError.validation('ID lớp học không hợp lệ'));
    }

    const { teacher_id } = await request.json();

    if (!teacher_id) {
      return errorResponse(ApiError.validation('Vui lòng cung cấp teacher_id'));
    }

    const teacherId = parseInt(teacher_id);
    if (!teacherId || isNaN(teacherId)) {
      return errorResponse(ApiError.validation('ID giảng viên không hợp lệ'));
    }

    // Verify class exists
    const classData = await dbGet('SELECT id, name, teacher_id FROM classes WHERE id = ?', [
      classId,
    ]);

    if (!classData) {
      return errorResponse(ApiError.notFound('Không tìm thấy lớp học'));
    }

    // Verify teacher exists and has teacher role
    const teacher = await dbGet('SELECT id, name FROM users WHERE id = ? AND role = ?', [
      teacherId,
      'teacher',
    ]);

    if (!teacher) {
      return errorResponse(ApiError.notFound('Không tìm thấy giảng viên'));
    }

    // Check if teacher already assigned to this class
    if (classData.teacher_id === teacherId) {
      return errorResponse(ApiError.conflict('Giảng viên này đã được gán cho lớp học'));
    }

    // Update class with new teacher
    await dbRun('UPDATE classes SET teacher_id = ? WHERE id = ?', [teacherId, classId]);

    // Log audit
    console.warn(
      `[AUDIT] Admin ${user.id} assigned teacher ${teacher.id} (${teacher.name}) to class ${classId} (${classData.name})`
    );

    return successResponse(
      {
        class_id: classId,
        class_name: classData.name,
        new_teacher_id: teacherId,
        new_teacher_name: teacher.name,
        previous_teacher_id: classData.teacher_id,
      },
      `Đã gán giảng viên ${teacher.name} cho lớp ${classData.name}`
    );
  } catch (error: any) {
    console.error('Error assigning teacher:', error);
    return errorResponse(
      ApiError.internalError('Lỗi khi gán giảng viên cho lớp học', { details: error?.stack })
    );
  }
}
