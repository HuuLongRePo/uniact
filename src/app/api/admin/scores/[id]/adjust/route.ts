import { NextRequest, NextResponse } from 'next/server';
import { getUserFromSession } from '@/lib/auth';
import { dbGet, dbRun } from '@/lib/database';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getUserFromSession();
    if (!user) return errorResponse(ApiError.unauthorized('Chưa xác thực'));
    if (user.role !== 'admin') return errorResponse(ApiError.forbidden('Không có quyền truy cập'));

    const studentId = id;
    const { points, reason } = await request.json();

    if (!points || !reason?.trim()) {
      return errorResponse(ApiError.validation('Thiếu trường bắt buộc'));
    }

    const student = await dbGet(
      `SELECT id FROM users WHERE id = ? AND role = 'student' AND (is_active IS NULL OR is_active = 1)`,
      [studentId]
    );
    if (!student) {
      return errorResponse(ApiError.notFound('Không tìm thấy học viên'));
    }

    // Store adjustment as a student_scores record (existing table)
    await dbRun(
      `
        INSERT INTO student_scores (student_id, activity_id, points, source, calculated_at)
        VALUES (?, NULL, ?, ?, datetime('now'))
      `,
      [studentId, points, `adjustment:${reason.trim()}`]
    );

    return successResponse({}, 'Adjusted');
  } catch (error: any) {
    console.error('Score adjustment error:', error);
    return errorResponse(ApiError.internalError(error.message || 'Internal server error'));
  }
}
