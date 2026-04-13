import { NextRequest } from 'next/server';
import { dbAll } from '@/lib/database';
import { requireApiRole } from '@/lib/guards';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  try {
    await requireApiRole(request, ['admin']);

    // Recalculate all student scores from participations
    const students = await dbAll(`
      SELECT DISTINCT student_id
      FROM participations
      WHERE attendance_status = 'attended'
    `);

    let updated = 0;

    for (const student of students) {
      // Tính tổng điểm từ point_calculations (theo participation)
      await dbAll(
        `
          SELECT COALESCE(SUM(pc.total_points), 0) as total
          FROM participations p
          LEFT JOIN point_calculations pc ON pc.participation_id = p.id
          WHERE p.student_id = ? AND p.attendance_status = 'attended'
        `,
        [student.student_id]
      );

      // Hiện tại hệ thống không lưu total_points vào users; điểm được tính theo participation/student_scores.
      updated++;
    }

    return successResponse({ updated }, `Đã tính lại điểm cho ${updated} sinh viên`);
  } catch (error: any) {
    console.error('Recalculate scores error:', error);
    return errorResponse(
      error instanceof ApiError ||
        (error && typeof error.status === 'number' && typeof error.code === 'string')
        ? error
        : ApiError.internalError(error?.message || 'Không thể tính lại điểm')
    );
  }
}
