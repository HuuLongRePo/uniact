import { NextRequest } from 'next/server';
import { dbGet, dbRun, dbReady } from '@/lib/database';
import { requireRole } from '@/lib/guards';
import { ApiError, successResponse, errorResponse } from '@/lib/api-response';

type ClassPermissionRow = {
  class_id: number;
  is_homeroom_primary: number;
};

async function assertCanEditClass(user: any, classId: number): Promise<void> {
  if (user.role === 'admin') return;

  const permission = (await dbGet(
    `
    SELECT
      c.id as class_id,
      CASE
        WHEN c.teacher_id = ? THEN 1
        WHEN EXISTS (
          SELECT 1
          FROM class_teachers ct_primary
          WHERE ct_primary.class_id = c.id
            AND ct_primary.teacher_id = ?
            AND ct_primary.role = 'primary'
        ) THEN 1
        ELSE 0
      END as is_homeroom_primary
    FROM classes c
    WHERE c.id = ?
    `,
    [user.id, user.id, classId]
  )) as ClassPermissionRow | undefined;

  if (!permission || !Number(permission.is_homeroom_primary)) {
    throw ApiError.forbidden('Bạn chỉ có quyền chỉnh sửa dữ liệu trên lớp do mình chủ nhiệm');
  }
}

// DELETE /api/teacher/classes/[id]/students/[studentId] - Xóa học viên khỏi lớp
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; studentId: string }> }
) {
  try {
    await dbReady();
    const { id, studentId } = await params;

    let user;
    try {
      user = await requireRole(request, ['teacher', 'admin']);
    } catch {
      return errorResponse(ApiError.unauthorized('Chưa đăng nhập'));
    }

    const classId = Number(id);
    const sid = Number(studentId);
    if (!classId || Number.isNaN(classId) || !sid || Number.isNaN(sid)) {
      return errorResponse(ApiError.validation('ID không hợp lệ'));
    }

    await assertCanEditClass(user, classId);

    const row = (await dbGet(`SELECT id, role, class_id FROM users WHERE id = ? LIMIT 1`, [
      sid,
    ])) as { id: number; role: string; class_id: number | null } | undefined;

    if (!row || row.role !== 'student') {
      return errorResponse(ApiError.notFound('Không tìm thấy học viên'));
    }

    if (Number(row.class_id) !== classId) {
      return errorResponse(ApiError.conflict('Học viên không thuộc lớp này'));
    }

    await dbRun(`UPDATE users SET class_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [
      sid,
    ]);

    return successResponse({}, 'Xóa học viên thành công');
  } catch (error: any) {
    console.error('Remove student from class error:', error);
    return errorResponse(
      error instanceof ApiError
        ? error
        : ApiError.internalError('Không thể xóa học viên', { details: error?.message })
    );
  }
}
