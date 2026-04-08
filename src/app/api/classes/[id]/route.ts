import { NextRequest } from 'next/server';
import { dbHelpers, dbGet, dbRun, dbAll } from '@/lib/database';
import { requireAuth, requireRole } from '@/lib/guards';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

// GET /api/classes/:id - Lấy thông tin lớp học
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    let user;
    try {
      user = await requireAuth(request);
    } catch (err: any) {
      return errorResponse(ApiError.unauthorized(err?.message || 'Chưa đăng nhập'));
    }

    const classId = Number(id);
    if (!classId || Number.isNaN(classId)) {
      return errorResponse(ApiError.validation('ID lớp học không hợp lệ'));
    }
    const classData = await dbHelpers.getClassById(classId);

    if (!classData) {
      return errorResponse(ApiError.notFound('Không tìm thấy lớp học'));
    }

    // Authorization
    if (user.role === 'teacher' && Number(classData.teacher_id) !== Number(user.id)) {
      return errorResponse(ApiError.forbidden('Bạn chỉ được xem lớp học bạn phụ trách'));
    }
    if (user.role === 'student' && Number(user.class_id) !== Number(classId)) {
      return errorResponse(ApiError.forbidden('Bạn chỉ được xem lớp học của mình'));
    }

    // Get teacher info
    if (classData.teacher_id) {
      const teacher = await dbGet('SELECT id, name, email FROM users WHERE id = ?', [
        classData.teacher_id,
      ]);
      classData.teacher = teacher;
    }

    // Get student count
    const studentCount = await dbGet(
      'SELECT COUNT(*) as count FROM users WHERE class_id = ? AND role = "student"',
      [classId]
    );
    classData.student_count = studentCount.count;

    // Get students list (teacher/admin only)
    if (user.role === 'admin' || user.role === 'teacher') {
      const students = await dbAll(
        `SELECT 
          u.id,
          u.name,
          u.email,
          u.created_at,
          (SELECT COUNT(*) FROM participations WHERE student_id = u.id) as activity_count,
          (SELECT SUM(points) FROM student_scores WHERE student_id = u.id) as total_points
        FROM users u
        WHERE u.class_id = ? AND u.role = 'student'
        ORDER BY u.name`,
        [classId]
      );
      classData.students = students;
    }

    return successResponse({ class: classData });
  } catch (error: any) {
    console.error('Get class error:', error);
    return errorResponse(ApiError.internalError('Lỗi server'));
  }
}

// PUT /api/classes/:id - Cập nhật lớp học
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
    const { name, grade, description, teacher_id } = await request.json();

    // Check class exists
    const existingClass = await dbHelpers.getClassById(classId);
    if (!existingClass) {
      return errorResponse(ApiError.notFound('Không tìm thấy lớp học'));
    }

    // Build update query
    const updates: string[] = [];
    const updateParams: any[] = [];

    if (name) {
      updates.push('name = ?');
      updateParams.push(name);
    }

    if (grade) {
      updates.push('grade = ?');
      updateParams.push(grade);
    }

    if (description !== undefined) {
      updates.push('description = ?');
      updateParams.push(description);
    }

    if (teacher_id !== undefined) {
      // Validate teacher exists
      if (teacher_id) {
        const teacher = await dbGet('SELECT id FROM users WHERE id = ? AND role = "teacher"', [
          teacher_id,
        ]);
        if (!teacher) {
          return errorResponse(ApiError.validation('Giảng viên không tồn tại'));
        }
      }
      updates.push('teacher_id = ?');
      updateParams.push(teacher_id);
    }

    if (updates.length === 0) {
      return errorResponse(ApiError.validation('Không có gì để cập nhật'));
    }

    updateParams.push(classId);

    await dbRun(`UPDATE classes SET ${updates.join(', ')} WHERE id = ?`, updateParams);

    // Log action
    await dbHelpers.createAuditLog(
      user.id,
      'UPDATE',
      'classes',
      classId,
      `Cập nhật lớp học: ${name || existingClass.name}`
    );

    // Get updated class
    const updatedClass = await dbHelpers.getClassById(classId);

    return successResponse({ class: updatedClass }, 'Cập nhật lớp học thành công');
  } catch (error: any) {
    console.error('Update class error:', error);
    return errorResponse(ApiError.internalError('Lỗi server'));
  }
}

// DELETE /api/classes/:id - Xóa lớp học
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Check class exists
    const existingClass = await dbHelpers.getClassById(classId);
    if (!existingClass) {
      return errorResponse(ApiError.notFound('Không tìm thấy lớp học'));
    }

    // Check if class has students
    const studentCount = await dbGet(
      'SELECT COUNT(*) as count FROM users WHERE class_id = ? AND role = "student"',
      [classId]
    );

    if (studentCount.count > 0) {
      return errorResponse(
        ApiError.validation(
          `Không thể xóa lớp học có ${studentCount.count} học viên. Vui lòng chuyển học viên sang lớp khác trước.`
        )
      );
    }

    // Delete class
    await dbRun('DELETE FROM classes WHERE id = ?', [classId]);

    // Log action
    await dbHelpers.createAuditLog(
      user.id,
      'DELETE',
      'classes',
      classId,
      `Xóa lớp học: ${existingClass.name}`
    );

    return successResponse({ ok: true }, 'Xóa lớp học thành công');
  } catch (error: any) {
    console.error('Delete class error:', error);
    return errorResponse(ApiError.internalError('Lỗi server'));
  }
}
