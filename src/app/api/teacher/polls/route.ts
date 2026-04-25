import { NextRequest } from 'next/server';
import { dbAll, dbGet, dbReady, dbRun } from '@/lib/database';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import { ensurePollSchema } from '@/lib/polls';
import { requireApiRole } from '@/lib/guards';

function normalizeBool(value: unknown): number {
  return value ? 1 : 0;
}

async function verifyTeacherClassAccess(userId: number, classId: number) {
  const accessibleClass = await dbGet(
    `
      SELECT c.id
      FROM classes c
      LEFT JOIN class_teachers ct ON ct.class_id = c.id
      WHERE c.id = ? AND (c.teacher_id = ? OR ct.teacher_id = ?)
      LIMIT 1
    `,
    [classId, userId, userId]
  );

  return Boolean(accessibleClass);
}

export async function GET(request: NextRequest) {
  try {
    await dbReady();
    await ensurePollSchema();

    const user = await requireApiRole(request, ['teacher', 'admin']);
    const polls =
      user.role === 'admin'
        ? await dbAll(
            `
              SELECT
                p.*,
                c.name AS class_name,
                u.name AS creator_name,
                COUNT(DISTINCT pr.user_id) AS response_count
              FROM polls p
              LEFT JOIN classes c ON c.id = p.class_id
              LEFT JOIN users u ON u.id = p.created_by
              LEFT JOIN poll_responses pr ON pr.poll_id = p.id
              GROUP BY p.id
              ORDER BY datetime(p.created_at) DESC, p.id DESC
            `
          )
        : await dbAll(
            `
              SELECT
                p.*,
                c.name AS class_name,
                COUNT(DISTINCT pr.user_id) AS response_count
              FROM polls p
              LEFT JOIN classes c ON c.id = p.class_id
              LEFT JOIN poll_responses pr ON pr.poll_id = p.id
              WHERE p.created_by = ?
              GROUP BY p.id
              ORDER BY datetime(p.created_at) DESC, p.id DESC
            `,
            [user.id]
          );

    return successResponse({ polls });
  } catch (error) {
    console.error('Teacher polls list error:', error);
    return errorResponse(
      error instanceof ApiError ||
        (error && typeof (error as any).status === 'number' && typeof (error as any).code === 'string')
        ? (error as ApiError)
        : ApiError.internalError('Khong the tai danh sach poll')
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbReady();
    await ensurePollSchema();

    const user = await requireApiRole(request, ['teacher', 'admin']);
    const body = await request.json();

    const title = String(body?.title || '').trim();
    const description = String(body?.description || '').trim();
    const classIdRaw = body?.class_id;
    const allowMultiple = normalizeBool(body?.allow_multiple);
    const options = Array.isArray(body?.options)
      ? body.options.map((option: unknown) => String(option || '').trim()).filter(Boolean)
      : [];

    if (!title) {
      return errorResponse(ApiError.validation('Tieu de poll la bat buoc'));
    }

    if (options.length < 2) {
      return errorResponse(ApiError.validation('Can it nhat 2 lua chon'));
    }

    const classId =
      classIdRaw === null || classIdRaw === undefined || classIdRaw === ''
        ? null
        : Number.parseInt(String(classIdRaw), 10);

    if (classId !== null && (!Number.isFinite(classId) || classId <= 0)) {
      return errorResponse(ApiError.validation('class_id khong hop le'));
    }

    if (user.role === 'teacher' && classId) {
      const canAccessClass = await verifyTeacherClassAccess(user.id, classId);
      if (!canAccessClass) {
        return errorResponse(ApiError.forbidden('Khong co quyen tao poll cho lop nay'));
      }
    }

    const now = new Date().toISOString();
    const pollResult = await dbRun(
      `
        INSERT INTO polls (title, description, created_by, class_id, status, allow_multiple, created_at)
        VALUES (?, ?, ?, ?, 'active', ?, ?)
      `,
      [title, description, user.id, classId, allowMultiple, now]
    );

    const pollId = Number(pollResult.lastID || 0);
    if (!pollId) {
      return errorResponse(ApiError.internalError('Khong the tao poll'));
    }

    for (let index = 0; index < options.length; index += 1) {
      await dbRun(
        `
          INSERT INTO poll_options (poll_id, option_text, display_order)
          VALUES (?, ?, ?)
        `,
        [pollId, options[index], index]
      );
    }

    const poll = await dbGet('SELECT * FROM polls WHERE id = ?', [pollId]);
    return successResponse({ poll_id: pollId, poll }, 'Tao poll thanh cong', 201);
  } catch (error) {
    console.error('Teacher poll create error:', error);
    return errorResponse(
      error instanceof ApiError ||
        (error && typeof (error as any).status === 'number' && typeof (error as any).code === 'string')
        ? (error as ApiError)
        : ApiError.internalError('Khong the tao poll')
    );
  }
}
