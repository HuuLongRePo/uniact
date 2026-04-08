import { NextRequest } from 'next/server';
import { requireRole } from '@/lib/guards';
import { dbRun, dbGet, dbAll } from '@/lib/database';
import { ApiError, successResponse, errorResponse } from '@/lib/api-response';

// POST /api/classes/[id]/students - Bulk assign/enroll students to class
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    let user;
    try {
      user = await requireRole(request, ['admin', 'teacher']);
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

    // Verify class exists
    const classData = await dbGet('SELECT id, name, teacher_id FROM classes WHERE id = ?', [
      classId,
    ]);

    if (!classData) {
      return errorResponse(ApiError.notFound('Không tìm thấy lớp học'));
    }

    // Teacher can only assign to their own class
    if (user.role === 'teacher' && classData.teacher_id !== user.id) {
      return errorResponse(
        ApiError.forbidden('Bạn chỉ được thêm học viên vào lớp học bạn phụ trách')
      );
    }

    const { student_ids } = await request.json();

    if (!Array.isArray(student_ids) || student_ids.length === 0) {
      return errorResponse(ApiError.validation('student_ids phải là mảng không rỗng'));
    }

    // Validate all student IDs are numbers
    const validStudentIds = student_ids.map((id) => parseInt(id)).filter((id) => !isNaN(id));
    if (validStudentIds.length !== student_ids.length) {
      return errorResponse(ApiError.validation('Tất cả student_ids phải là số nguyên hợp lệ'));
    }

    // Verify all students exist and are students
    const placeholders = validStudentIds.map(() => '?').join(',');
    const existingStudents = await dbAll(
      `SELECT id, name FROM users 
       WHERE id IN (${placeholders}) AND role = 'student'`,
      validStudentIds
    );

    if (existingStudents.length !== validStudentIds.length) {
      const foundIds = existingStudents.map((s) => s.id);
      const missingIds = validStudentIds.filter((id) => !foundIds.includes(id));
      return errorResponse(ApiError.notFound(`Không tìm thấy học viên: ${missingIds.join(', ')}`));
    }

    // Assign students to class
    const results = {
      assigned: 0,
      already_assigned: 0,
      errors: [] as any[],
    };

    const alreadyAssignedIds: number[] = [];

    for (const studentId of validStudentIds) {
      try {
        // Check current assignment
        const currentAssignment = await dbGet('SELECT class_id FROM users WHERE id = ?', [
          studentId,
        ]);

        if (currentAssignment?.class_id === classId) {
          results.already_assigned++;
          alreadyAssignedIds.push(studentId);
          continue;
        }

        // Update student's class assignment
        await dbRun('UPDATE users SET class_id = ? WHERE id = ?', [classId, studentId]);

        results.assigned++;
      } catch (err: any) {
        results.errors.push({
          student_id: studentId,
          error: err.message,
        });
      }
    }

    // Log audit
    console.warn(
      `[AUDIT] ${user.role} ${user.id} bulk-assigned ${results.assigned} students to class ${classId}`
    );

    const data = {
      class_id: classId,
      class_name: classData.name,
      total_attempted: validStudentIds.length,
      assigned: results.assigned,
      already_assigned: results.already_assigned,
      errors: results.errors,
      students: existingStudents.map((s) => ({
        id: s.id,
        name: s.name,
        status: results.errors.some((e) => e.student_id === s.id)
          ? 'error'
          : alreadyAssignedIds.includes(Number(s.id))
            ? 'already_assigned'
            : 'assigned',
      })),
    };

    return successResponse(data, `Đã gán học viên vào lớp ${classData.name} thành công`);
  } catch (error: any) {
    console.error('Error bulk assigning students:', error);
    return errorResponse(
      ApiError.internalError('Lỗi khi gán học viên vào lớp', { details: error?.stack })
    );
  }
}
