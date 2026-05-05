import { NextRequest } from 'next/server';
import { getUserFromSession } from '@/lib/auth';
import { dbAll } from '@/lib/database';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

export async function GET(_request: NextRequest) {
  try {
    const user = await getUserFromSession();
    if (!user) return errorResponse(ApiError.unauthorized('Chua dang nhap'));
    if (user.role !== 'student') {
      return errorResponse(ApiError.forbidden('Khong co quyen truy cap'));
    }

    const awards = await dbAll(
      `SELECT
        sa.id,
        COALESCE(at.name, 'Award') as awardName,
        sa.awarded_at as awardedAt,
        COALESCE(at.min_points, 0) as points,
        COALESCE(sa.reason, '') as reason,
        NULL as activityTitle
      FROM student_awards sa
      LEFT JOIN award_types at ON sa.award_type_id = at.id
      WHERE sa.student_id = ?
      ORDER BY sa.awarded_at DESC`,
      [user.id]
    );

    const totalPoints = awards.reduce((sum: number, award: any) => sum + Number(award.points || 0), 0);

    return successResponse({ awards, totalPoints });
  } catch (error) {
    console.error('Get award history error:', error);
    return errorResponse(ApiError.internalError('Khong the tai lich su khen thuong'));
  }
}
