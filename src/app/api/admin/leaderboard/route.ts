import { NextRequest } from 'next/server';
import { dbAll } from '@/lib/database';
import { requireApiRole } from '@/lib/guards';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    await requireApiRole(request, ['admin']);

    const { searchParams } = new URL(request.url);
    const rawLimit = Number(searchParams.get('limit') || '20');
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(Math.trunc(rawLimit), 1), 100) : 20;

    const leaderboard = await dbAll(
      `
      SELECT 
        ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(COALESCE(pc.total_points, p.points_earned, 0)), 0) DESC) as rank,
        u.id as user_id,
        u.name,
        u.email,
        c.name as class_name,
        COALESCE(SUM(COALESCE(pc.total_points, p.points_earned, 0)), 0) as total_points,
        COUNT(DISTINCT CASE WHEN p.attendance_status = 'attended' THEN p.activity_id END) as activities_count
      FROM users u
      LEFT JOIN classes c ON u.class_id = c.id
      LEFT JOIN participations p ON u.id = p.student_id AND p.attendance_status = 'attended'
      LEFT JOIN point_calculations pc ON pc.participation_id = p.id
      WHERE u.role = 'student'
      GROUP BY u.id, u.name, u.email, c.name
      ORDER BY total_points DESC, u.name ASC
      LIMIT ?
    `,
      [limit]
    );

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
