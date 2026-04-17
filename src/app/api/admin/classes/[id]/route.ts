import { NextRequest } from 'next/server';
import { requireApiRole } from '@/lib/guards';
import { dbGet, dbRun, dbAll } from '@/lib/database';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

// GET /api/admin/classes/[id] - Get class by ID
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const classId = Number(id);
    if (!classId || Number.isNaN(classId)) {
      return errorResponse(ApiError.validation('ID lớp không hợp lệ'));
    }

    await requireApiRole(request, ['admin']);

    const classData = await dbGet(
      `SELECT 
        c.id, c.name, c.grade, c.teacher_id, t.name as teacher_name,
        c.description, c.created_at,
        COUNT(DISTINCT u.id) as student_count
      FROM classes c
      LEFT JOIN users u ON c.id = u.class_id AND u.role = 'student' AND (u.is_active IS NULL OR u.is_active = 1)
      LEFT JOIN users t ON c.teacher_id = t.id
      WHERE c.id = ?
      GROUP BY c.id`,
      [classId]
    );

    if (!classData) {
      return errorResponse(ApiError.notFound('Không tìm thấy lớp'));
    }

    const teachers = await dbAll(
      `SELECT u.id, u.name, u.email
       FROM class_teachers ct
       JOIN users u ON ct.teacher_id = u.id
       WHERE ct.class_id = ?`,
      [classId]
    );

    return successResponse({ class: { ...classData, teachers } });
  } catch (error: any) {
    console.error('Error fetching class:', error);
    const apiError =
      error instanceof ApiError
        ? error
        : error instanceof Error && typeof (error as any).status === 'number' && typeof (error as any).code === 'string'
          ? new ApiError((error as any).code, error.message, (error as any).status, (error as any).details)
          : ApiError.internalError('Không thể tải thông tin lớp', { details: error?.message });

    return errorResponse(apiError);
  }
}

// PUT /api/admin/classes/[id] - Update class
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const classId = Number(id);
    if (!classId || Number.isNaN(classId)) {
      return errorResponse(ApiError.validation('ID lớp không hợp lệ'));
    }

    const user = await requireApiRole(request, ['admin']);

    const body = await request.json();
    const { name, grade, description, teacher_id } = body;

    const existing = await dbGet('SELECT id FROM classes WHERE id = ?', [classId]);
    if (!existing) {
      return errorResponse(ApiError.notFound('Không tìm thấy lớp'));
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (grade !== undefined) {
      updates.push('grade = ?');
      values.push(grade);
    }
    if (teacher_id !== undefined) {
      updates.push('teacher_id = ?');
      values.push(teacher_id || null);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description || null);
    }

    if (updates.length === 0 && teacher_id === undefined) {
      return errorResponse(ApiError.validation('Không có trường nào để cập nhật'));
    }

    if (updates.length > 0) {
      values.push(classId);
      await dbRun(`UPDATE classes SET ${updates.join(', ')} WHERE id = ?`, values);
    }

    if (teacher_id !== undefined) {
      await dbRun('DELETE FROM class_teachers WHERE class_id = ?', [classId]);
      if (teacher_id) {
        const teacher = await dbGet('SELECT id FROM users WHERE id = ? AND role = ?', [
          teacher_id,
          'teacher',
        ]);
        if (!teacher) {
          return errorResponse(ApiError.notFound('Không tìm thấy giảng viên'));
        }

        await dbRun(
          "INSERT OR IGNORE INTO class_teachers (class_id, teacher_id, role, assigned_at) VALUES (?, ?, 'primary', datetime('now'))",
          [classId, teacher_id]
        );
      }
    }

    await dbRun(
      `INSERT INTO audit_logs (actor_id, action, target_table, target_id, details, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [user.id, 'UPDATE_CLASS', 'classes', classId, JSON.stringify(body)]
    );

    return successResponse({}, 'Cập nhật lớp thành công');
  } catch (error: any) {
    console.error('Error updating class:', error);
    const apiError =
      error instanceof ApiError
        ? error
        : error instanceof Error && typeof (error as any).status === 'number' && typeof (error as any).code === 'string'
          ? new ApiError((error as any).code, error.message, (error as any).status, (error as any).details)
          : ApiError.internalError('Không thể cập nhật lớp', { details: error?.message });

    return errorResponse(apiError);
  }
}

// DELETE /api/admin/classes/[id] - Delete class
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const classId = Number(id);
    if (!classId || Number.isNaN(classId)) {
      return errorResponse(ApiError.validation('ID lớp không hợp lệ'));
    }

    const user = await requireApiRole(request, ['admin']);

    const existing = await dbGet('SELECT id, name FROM classes WHERE id = ?', [classId]);
    if (!existing) {
      return errorResponse(ApiError.notFound('Không tìm thấy lớp'));
    }

    const students = await dbAll('SELECT id FROM users WHERE class_id = ?', [classId]);
    if (students.length > 0) {
      return errorResponse(
        ApiError.validation('Không thể xóa lớp đang có học viên. Hãy chuyển lớp cho học viên trước.')
      );
    }

    await dbRun('DELETE FROM class_teachers WHERE class_id = ?', [classId]);
    await dbRun('DELETE FROM classes WHERE id = ?', [classId]);

    await dbRun(
      `INSERT INTO audit_logs (actor_id, action, target_table, target_id, details, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [user.id, 'DELETE_CLASS', 'classes', classId, JSON.stringify({ name: existing.name })]
    );

    return successResponse({}, 'Xóa lớp thành công');
  } catch (error: any) {
    console.error('Error deleting class:', error);
    const apiError =
      error instanceof ApiError
        ? error
        : error instanceof Error && typeof (error as any).status === 'number' && typeof (error as any).code === 'string'
          ? new ApiError((error as any).code, error.message, (error as any).status, (error as any).details)
          : ApiError.internalError('Không thể xóa lớp', { details: error?.message });

    return errorResponse(apiError);
  }
}
