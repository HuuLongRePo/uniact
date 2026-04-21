import { NextRequest } from 'next/server';
import { getUserFromSession } from '@/lib/auth';
import { dbGet } from '@/lib/database';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromSession();
    if (!user) return errorResponse(ApiError.unauthorized('Chưa đăng nhập'));
    if (user.role !== 'student')
      return errorResponse(ApiError.forbidden('Không có quyền truy cập'));

    // Tổng điểm hiện tại dựa trên student_scores
    const result: any = await dbGet(
      `
      SELECT COALESCE(SUM(points), 0) as total
      FROM student_scores
      WHERE student_id = ?
    `,
      [user.id]
    );

    const currentPoints = result?.total || 0;

    // Define award thresholds
    const awardThresholds = [
      {
        type: 'Giải Xuất Sắc',
        points_needed: 500,
        description: 'Dành cho sinh viên có điểm rèn luyện ≥ 500',
      },
      {
        type: 'Giải Khá',
        points_needed: 300,
        description: 'Dành cho sinh viên có điểm rèn luyện ≥ 300',
      },
      {
        type: 'Giải Trung Bình Khá',
        points_needed: 200,
        description: 'Dành cho sinh viên có điểm rèn luyện ≥ 200',
      },
    ];

    const upcomingAwards = awardThresholds
      .filter((award) => currentPoints < award.points_needed)
      .map((award) => ({
        ...award,
        current_points: currentPoints,
        progress: Math.min(Math.round((currentPoints / award.points_needed) * 100), 100),
      }))
      .sort((a, b) => a.points_needed - b.points_needed);

    return successResponse({ awards: upcomingAwards });
  } catch (error: any) {
    console.error('Get upcoming awards error:', error);
    return errorResponse(ApiError.internalError(error.message || 'Lỗi máy chủ nội bộ'));
  }
}
