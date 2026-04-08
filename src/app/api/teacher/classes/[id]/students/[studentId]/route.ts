import { NextRequest } from 'next/server';
import { dbGet, dbRun, dbReady } from '@/lib/database';
import { requireRole } from '@/lib/guards';
import { ApiError, successResponse, errorResponse } from '@/lib/api-response';

async function assertCanManageClass(user: any, classId: number): Promise<void> {
  if (user.role === 'admin') return;

  const row = await dbGet(
    `
    SELECT c.id
    FROM classes c
    LEFT JOIN class_teachers ct ON ct.class_id = c.id AND ct.teacher_id = ?
    WHERE c.id = ? AND (c.teacher_id = ? OR ct.teacher_id IS NOT NULL)
    `,
    [user.id, classId, user.id]
  );

  if (!row) {
    throw ApiError.forbidden('Bạn chưa được phân công lớp này');
  }
}

// DELETE /api/teacher/classes/[id]/students/[studentId] - Xóa sinh viên khỏi lớp
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

    await assertCanManageClass(user, classId);

    const row = (await dbGet(`SELECT id, role, class_id FROM users WHERE id = ? LIMIT 1`, [
      sid,
    ])) as { id: number; role: string; class_id: number | null } | undefined;

    if (!row || row.role !== 'student') {
      return errorResponse(ApiError.notFound('Không tìm thấy sinh viên'));
    }

    if (Number(row.class_id) !== classId) {
      return errorResponse(ApiError.conflict('Sinh viên không thuộc lớp này'));
    }

    await dbRun(`UPDATE users SET class_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [
      sid,
    ]);

    return successResponse({}, 'Xóa sinh viên thành công');
  } catch (error: any) {
    console.error('Remove student from class error:', error);
    return errorResponse(
      error instanceof ApiError
        ? error
        : ApiError.internalError('Không thể xóa sinh viên', { details: error?.message })
    );
  }
}
