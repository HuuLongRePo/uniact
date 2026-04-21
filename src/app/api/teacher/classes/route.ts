/**
 * API Route: Lớp học của giảng viên
 * GET /api/teacher/classes
 */

import { NextRequest } from 'next/server';
import { dbAll, dbReady } from '@/lib/database';
import { requireRole } from '@/lib/guards';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    await dbReady();

    let user;
    try {
      user = await requireRole(request, ['teacher', 'admin']);
    } catch (err: any) {
      const msg = String(err?.message || '');
      return errorResponse(
        msg.includes('Chưa đăng nhập')
          ? ApiError.unauthorized('Chưa đăng nhập')
          : ApiError.forbidden('Không có quyền truy cập')
      );
    }

    const isAdmin = user.role === 'admin';

    const classes = await dbAll(
      `
      SELECT
        c.id,
        c.name,
        c.grade,
        (SELECT COUNT(*) FROM users u WHERE u.class_id = c.id AND u.role = 'student') as student_count,
        CASE
          WHEN ? = 1 THEN 1
          WHEN c.teacher_id = ? THEN 1
          WHEN EXISTS (
            SELECT 1 FROM class_teachers ct_primary
            WHERE ct_primary.class_id = c.id
              AND ct_primary.teacher_id = ?
              AND ct_primary.role = 'primary'
          ) THEN 1
          ELSE 0
        END as is_homeroom_class,
        CASE
          WHEN ? = 1 THEN 'admin'
          WHEN c.teacher_id = ? THEN 'primary'
          WHEN EXISTS (
            SELECT 1 FROM class_teachers ct_primary
            WHERE ct_primary.class_id = c.id
              AND ct_primary.teacher_id = ?
              AND ct_primary.role = 'primary'
          ) THEN 'primary'
          WHEN EXISTS (
            SELECT 1 FROM class_teachers ct_assistant
            WHERE ct_assistant.class_id = c.id
              AND ct_assistant.teacher_id = ?
          ) THEN 'assistant'
          ELSE 'none'
        END as teacher_class_role
      FROM classes c
      WHERE (
        ? = 1
        OR c.teacher_id = ?
        OR EXISTS (
          SELECT 1 FROM class_teachers ct
          WHERE ct.class_id = c.id AND ct.teacher_id = ?
        )
      )
      ORDER BY c.grade ASC, c.name ASC
      `,
      [
        isAdmin ? 1 : 0,
        user.id,
        user.id,
        isAdmin ? 1 : 0,
        user.id,
        user.id,
        user.id,
        isAdmin ? 1 : 0,
        user.id,
        user.id,
      ]
    );

    const normalized = (classes as any[]).map((c: any) => ({
      id: Number(c.id),
      name: String(c.name),
      grade: String(c.grade ?? ''),
      studentCount: Number(c.student_count ?? 0),
      isHomeroomClass: Boolean(Number(c.is_homeroom_class ?? 0)),
      teacherClassRole: String(c.teacher_class_role || 'none'),
      canEdit: Boolean(Number(c.is_homeroom_class ?? 0)),
    }));

    return successResponse({ classes: normalized });
  } catch (error: any) {
    console.error('Get teacher classes error:', error);
    return errorResponse(ApiError.internalError('Lỗi server', { details: error.message }));
  }
}
