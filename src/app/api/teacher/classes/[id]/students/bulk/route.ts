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

// POST /api/teacher/classes/[id]/students/bulk - Thêm nhiều học viên vào lớp theo danh sách email
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbReady();
    const { id } = await params;

    let user;
    try {
      user = await requireRole(request, ['teacher', 'admin']);
    } catch {
      return errorResponse(ApiError.unauthorized('Chưa đăng nhập'));
    }

    const classId = Number(id);
    if (!classId || Number.isNaN(classId)) {
      return errorResponse(ApiError.validation('ID lớp học không hợp lệ'));
    }

    await assertCanManageClass(user, classId);

    const body = await request.json().catch(() => ({}));
    const emails: any[] = Array.isArray(body?.emails) ? body.emails : [];
    const normalizedEmails: string[] = Array.from(
      new Set<string>(
        emails
          .map((e: any) =>
            String(e || '')
              .trim()
              .toLowerCase()
          )
          .filter(Boolean)
      )
    );

    if (normalizedEmails.length === 0) {
      return errorResponse(ApiError.validation('Vui lòng nhập ít nhất 1 email'));
    }

    let added = 0;
    let skipped = 0;
    const errors: Array<{ email: string; reason: string }> = [];

    for (const email of normalizedEmails) {
      const student = (await dbGet(
        `SELECT id, role, class_id FROM users WHERE lower(email) = lower(?) LIMIT 1`,
        [email]
      )) as { id: number; role: string; class_id: number | null } | undefined;

      if (!student) {
        skipped++;
        errors.push({ email, reason: 'Không tìm thấy sinh viên' });
        continue;
      }

      if (student.role !== 'student') {
        skipped++;
        errors.push({ email, reason: 'Tài khoản không phải sinh viên' });
        continue;
      }

      if (Number(student.class_id) === classId) {
        skipped++;
        continue;
      }

      await dbRun(`UPDATE users SET class_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [
        classId,
        student.id,
      ]);
      added++;
    }

    return successResponse({ added, skipped, errors }, 'Thêm sinh viên thành công');
  } catch (error: any) {
    console.error('Bulk add students error:', error);
    return errorResponse(
      error instanceof ApiError
        ? error
        : ApiError.internalError('Không thể thêm sinh viên', { details: error?.message })
    );
  }
}
