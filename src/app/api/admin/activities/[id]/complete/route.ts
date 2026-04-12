import { NextRequest } from 'next/server';
import { dbRun, dbGet, dbAll } from '@/lib/database';
import { requireApiRole } from '@/lib/guards';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import { PointCalculationService } from '@/lib/scoring';

/**
 * POST /api/admin/activities/[id]/complete
 * Đánh dấu hoạt động hoàn thành + tự động tính điểm cho tất cả participations
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const activityId = Number(id);
    if (!Number.isInteger(activityId) || activityId <= 0) {
      return errorResponse(ApiError.validation('Mã hoạt động không hợp lệ'));
    }

    const user = await requireApiRole(request, ['admin', 'teacher']);

    const activity = await dbGet('SELECT * FROM activities WHERE id = ?', [activityId]);
    if (!activity) {
      return errorResponse(ApiError.notFound('Không tìm thấy hoạt động'));
    }

    if (activity.status === 'completed') {
      return errorResponse(ApiError.validation('Hoạt động đã được hoàn thành'));
    }

    if (activity.status === 'cancelled') {
      return errorResponse(ApiError.validation('Không thể hoàn thành hoạt động đã bị hủy'));
    }

    await dbRun('UPDATE activities SET status = ? WHERE id = ?', ['completed', activityId]);

    const participations = await dbAll(
      `
      SELECT id, student_id, achievement_level
      FROM participations
      WHERE activity_id = ?
      AND attendance_status = 'attended'
      AND achievement_level IS NOT NULL
    `,
      [activityId]
    );

    let pointsCalculated = 0;
    const results = [];

    for (const p of participations) {
      try {
        const calcResult = await PointCalculationService.autoCalculateAfterEvaluation(p.id);
        pointsCalculated++;
        results.push({
          participationId: p.id,
          studentId: p.student_id,
          points: calcResult.totalPoints,
          formula: calcResult.formula,
        });
      } catch (error: any) {
        console.error(`Failed to calculate points for participation ${p.id}:`, error);
        results.push({
          participationId: p.id,
          studentId: p.student_id,
          error: error.message,
        });
      }
    }

    await dbRun(
      `INSERT INTO audit_logs (actor_id, action, target_table, target_id, details)
       VALUES (?, 'COMPLETE_ACTIVITY', 'activities', ?, ?)`,
      [
        user.id,
        activityId,
        `Completed activity "${activity.title}" and calculated ${pointsCalculated} points`,
      ]
    );

    return successResponse(
      {
        activity: {
          id: activity.id,
          title: activity.title,
          status: 'completed',
        },
        pointsCalculated,
        totalParticipations: participations.length,
        results,
      },
      `Hoạt động đã được hoàn thành. Đã tính điểm ${pointsCalculated}/${participations.length} lượt tham gia.`
    );
  } catch (error: any) {
    console.error('Error completing activity:', error);
    return errorResponse(
      error instanceof ApiError ||
        (error && typeof error.status === 'number' && typeof error.code === 'string')
        ? error
        : ApiError.internalError('Không thể hoàn thành hoạt động', { details: error?.message })
    );
  }
}
