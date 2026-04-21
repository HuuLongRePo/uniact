import { NextRequest } from 'next/server';
import { dbAll, dbGet, dbRun, dbReady } from '@/lib/database';
import { requireRole } from '@/lib/guards';
import { ApiError, successResponse, errorResponse } from '@/lib/api-response';

type ClassPermissionRow = {
  class_id: number;
  is_homeroom_primary: number;
  has_any_assignment: number;
};

async function getClassPermission(user: any, classId: number): Promise<ClassPermissionRow | null> {
  if (user.role === 'admin') {
    return {
      class_id: classId,
      is_homeroom_primary: 1,
      has_any_assignment: 1,
    };
  }

  const row = (await dbGet(
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
      END as is_homeroom_primary,
      CASE
        WHEN c.teacher_id = ? THEN 1
        WHEN EXISTS (
          SELECT 1
          FROM class_teachers ct_any
          WHERE ct_any.class_id = c.id
            AND ct_any.teacher_id = ?
        ) THEN 1
        ELSE 0
      END as has_any_assignment
    FROM classes c
    WHERE c.id = ?
    `,
    [user.id, user.id, user.id, user.id, classId]
  )) as ClassPermissionRow | undefined;

  return row || null;
}

async function assertCanViewClass(user: any, classId: number): Promise<void> {
  const permission = await getClassPermission(user, classId);
  if (!permission || !Number(permission.has_any_assignment)) {
    throw ApiError.forbidden('Bạn chưa được phân công lớp này');
  }
}

async function assertCanEditClass(user: any, classId: number): Promise<void> {
  const permission = await getClassPermission(user, classId);
  if (!permission || !Number(permission.is_homeroom_primary)) {
    throw ApiError.forbidden('Bạn chỉ có quyền chỉnh sửa dữ liệu trên lớp do mình chủ nhiệm');
  }
}

// GET /api/teacher/classes/[id]/students - Lấy danh sách học viên trong lớp của giảng viên
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    await assertCanViewClass(user, classId);

    const students = await dbAll(
      `SELECT 
        u.id,
        u.name,
        u.email,
        COALESCE((SELECT SUM(ss.points) FROM student_scores ss WHERE ss.student_id = u.id), 0) as total_points,
        (SELECT COUNT(*) FROM participations p WHERE p.student_id = u.id AND p.attendance_status = 'attended') as attended_count
      FROM users u
      WHERE u.class_id = ? AND u.role = 'student'
      ORDER BY u.name ASC`,
      [classId]
    );

    const normalized = (students as any[]).map((s: any) => ({
      id: Number(s.id),
      name: String(s.name),
      email: String(s.email),
      totalPoints: Number(s.total_points ?? 0),
      attendedActivities: Number(s.attended_count ?? 0),
    }));

    return successResponse({ students: normalized });
  } catch (error: any) {
    console.error('Lỗi lấy danh sách học viên theo lớp:', error);
    return errorResponse(
      error instanceof ApiError
        ? error
        : ApiError.internalError('Không thể lấy danh sách học viên', { details: error?.message })
    );
  }
}

// POST /api/teacher/classes/[id]/students - Thêm học viên vào lớp theo email
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

    await assertCanEditClass(user, classId);

    const body = await request.json().catch(() => ({}));
    const email = String(body?.email || '')
      .trim()
      .toLowerCase();
    if (!email) {
      return errorResponse(ApiError.validation('Vui lòng nhập email'));
    }

    const student = (await dbGet(
      `SELECT id, role, class_id FROM users WHERE lower(email) = lower(?) LIMIT 1`,
      [email]
    )) as { id: number; role: string; class_id: number | null } | undefined;

    if (!student) {
      return errorResponse(ApiError.notFound('Không tìm thấy học viên với email này'));
    }

    if (student.role !== 'student') {
      return errorResponse(ApiError.validation('Tài khoản này không phải học viên'));
    }

    if (Number(student.class_id) === classId) {
      return errorResponse(ApiError.conflict('Học viên đã ở trong lớp này'));
    }

    await dbRun(`UPDATE users SET class_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [
      classId,
      student.id,
    ]);

    return successResponse({}, 'Thêm học viên thành công');
  } catch (error: any) {
    console.error('Add student to class error:', error);
    return errorResponse(
      error instanceof ApiError
        ? error
        : ApiError.internalError('Không thể thêm học viên', { details: error?.message })
    );
  }
}
