import { NextRequest, NextResponse } from 'next/server';
import { getUserFromSession } from '@/lib/auth';
import { dbRun, dbAll } from '@/lib/database';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromSession();
    if (!user) return errorResponse(ApiError.unauthorized('Unauthorized'));
    if (user.role !== 'admin') return errorResponse(ApiError.forbidden('Forbidden'));

    // Recalculate all student scores from participations
    const students = await dbAll(`
      SELECT DISTINCT student_id
      FROM participations
      WHERE attendance_status = 'present'
    `);

    let updated = 0;

    for (const student of students) {
      // Tính tổng điểm từ point_calculations (theo participation)
      await dbAll(
        `
          SELECT COALESCE(SUM(pc.total_points), 0) as total
          FROM participations p
          LEFT JOIN point_calculations pc ON pc.participation_id = p.id
          WHERE p.student_id = ? AND p.attendance_status = 'present'
        `,
        [student.student_id]
      );

      // Hiện tại hệ thống không lưu total_points vào users; điểm được tính theo participation/student_scores.
      updated++;
    }

    return successResponse({ updated }, `Đã tính lại điểm cho ${updated} sinh viên`);
  } catch (error: any) {
    console.error('Recalculate scores error:', error);
    return errorResponse(ApiError.internalError(error.message || 'Internal server error'));
  }
}
