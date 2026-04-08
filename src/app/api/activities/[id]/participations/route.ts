import { NextRequest, NextResponse } from 'next/server';
import { dbAll } from '@/lib/database';
import { requireAuth } from '@/lib/guards';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

/**
 * GET /api/activities/:id/participations
 * Get all participations for an activity
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    try {
      await requireAuth(request);
    } catch {
      return errorResponse(ApiError.unauthorized('Chưa đăng nhập'));
    }

    const { id } = await params;
    const activityId = parseInt(id);
    if (Number.isNaN(activityId)) {
      return errorResponse(ApiError.validation('ID hoạt động không hợp lệ'));
    }

    const participations = await dbAll(
      `SELECT 
        p.id,
        p.student_id,
        p.attendance_status,
        p.achievement_level,
        p.award_type,
        p.evaluated_at,
        COALESCE(u1.full_name, u1.name) as student_name,
        COALESCE(u1.student_code, u1.code, u1.username, u1.student_id) as student_code,
        COALESCE(u2.full_name, u2.name) as evaluator_name,
        pc.total_points
       FROM participations p
       JOIN users u1 ON p.student_id = u1.id
       LEFT JOIN users u2 ON p.evaluated_by = u2.id
       LEFT JOIN point_calculations pc ON p.id = pc.participation_id
       WHERE p.activity_id = ?
       ORDER BY COALESCE(u1.full_name, u1.name)`,
      [activityId]
    );

    return successResponse(participations as any);
  } catch (error: any) {
    console.error('Error fetching participations:', error);
    return errorResponse(
      ApiError.internalError('Không thể tải danh sách tham gia', error?.message)
    );
  }
}
