import { NextRequest } from 'next/server';
import { dbAll } from '@/lib/database';
import { requireApiRole } from '@/lib/guards';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import { getFinalScoreLedgerByStudentIds } from '@/lib/score-ledger';

export async function GET(request: NextRequest) {
  try {
    await requireApiRole(request, ['admin']);

    const { searchParams } = new URL(request.url);
    const rawLimit = Number(searchParams.get('limit') || '20');
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(Math.trunc(rawLimit), 1), 100) : 20;

    const studentRows = (await dbAll(
      `
      SELECT 
        u.id as user_id,
        u.name,
        u.email,
        c.name as class_name,
        COUNT(DISTINCT CASE WHEN p.attendance_status = 'attended' THEN p.activity_id END) as activities_count
      FROM users u
      LEFT JOIN classes c ON u.class_id = c.id
      LEFT JOIN participations p ON u.id = p.student_id
      WHERE u.role = 'student'
      GROUP BY u.id, u.name, u.email, c.name
      ORDER BY u.name ASC
    `
    )) as Array<{
      user_id: number;
      name: string;
      email: string;
      class_name: string | null;
      activities_count: number;
    }>;

    const ledgers = await getFinalScoreLedgerByStudentIds(
      studentRows.map((student) => student.user_id)
    );

    const leaderboard = studentRows
      .map((student) => {
        const fallbackTotalPoints = Number(
          (student as { total_points?: unknown }).total_points || 0
        );
        const ledgerTotalPoints = Number(ledgers.get(Number(student.user_id))?.final_total || 0);

        return {
          user_id: student.user_id,
          name: student.name,
          email: student.email,
          class_name: student.class_name,
          total_points:
            ledgerTotalPoints > 0 || fallbackTotalPoints === 0
              ? ledgerTotalPoints
              : fallbackTotalPoints,
          activities_count: Number(student.activities_count || 0),
        };
      })
      .sort((left, right) => {
        if (right.total_points !== left.total_points) {
          return right.total_points - left.total_points;
        }
        return String(left.name).localeCompare(String(right.name));
      })
      .slice(0, limit)
      .map((student, index) => ({
        rank: index + 1,
        ...student,
      }));

    return successResponse({ leaderboard, limit });
  } catch (error: any) {
    console.error('Leaderboard error:', error);
    const isCanonicalApiError =
      error instanceof ApiError ||
      (error && typeof error.status === 'number' && typeof error.code === 'string');

    return errorResponse(
      isCanonicalApiError
        ? error instanceof ApiError
          ? error
          : new ApiError(
              error.code,
              error.message || 'Không có quyền truy cập',
              error.status,
              error.details
            )
        : ApiError.internalError(error?.message || 'Không thể tải bảng xếp hạng')
    );
  }
}
