/**
 * API Route: Lớp học của giảng viên
 * GET /api/teacher/classes
 *
 * Trả về danh sách lớp mà giảng viên phụ trách
 * Dùng bảng class_teachers cho quan hệ nhiều-nhiều
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
        (SELECT COUNT(*) FROM users u WHERE u.class_id = c.id AND u.role = 'student') as student_count
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
      [isAdmin ? 1 : 0, user.id, user.id]
    );

    const normalized = (classes as any[]).map((c: any) => ({
      id: Number(c.id),
      name: String(c.name),
      grade: String(c.grade ?? ''),
      studentCount: Number(c.student_count ?? 0),
    }));

    return successResponse({ classes: normalized });
  } catch (error: any) {
    console.error('Get teacher classes error:', error);
    return errorResponse(ApiError.internalError('Lỗi server', { details: error.message }));
  }
}
