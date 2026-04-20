import { NextRequest } from 'next/server';
import { dbGet, dbReady, dbRun, withTransaction } from '@/lib/database';
import { PointCalculationService } from '@/lib/scoring';
import { requireApiRole } from '@/lib/guards';
import { ApiError, successResponse, errorResponse } from '@/lib/api-response';
import { teacherCanAccessActivity } from '@/lib/activity-access';
import { sendDatabaseNotification } from '@/lib/notifications';

type UiAchievementLevel = 'excellent' | 'good' | 'participated' | 'xuat_sac' | 'tot' | 'tham_gia';

function normalizeAchievementLevel(level: any): 'excellent' | 'good' | 'participated' {
  const raw = String(level || '').trim();
  switch (raw) {
    case 'excellent':
    case 'xuat_sac':
      return 'excellent';
    case 'good':
    case 'tot':
      return 'good';
    case 'participated':
    case 'tham_gia':
    default:
      return 'participated';
  }
}

// POST /api/teacher/activities/[id]/evaluate - Batch evaluate participants
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await dbReady();

    const user = await requireApiRole(request, ['teacher', 'admin']);

    const activityId = Number(id);
    if (!activityId || Number.isNaN(activityId)) {
      return errorResponse(ApiError.validation('ID hoạt động không hợp lệ'));
    }

    // Verify teacher owns this activity
    const activity = (await dbGet('SELECT id, teacher_id, title FROM activities WHERE id = ?', [
      activityId,
    ])) as any;

    if (!activity) {
      return errorResponse(ApiError.notFound('Không tìm thấy hoạt động'));
    }

    if (
      user.role === 'teacher' &&
      !(await teacherCanAccessActivity(Number(user.id), Number(activityId)))
    ) {
      return errorResponse(
        ApiError.forbidden('Bạn chỉ có thể đánh giá người tham gia của hoạt động thuộc phạm vi quản lý')
      );
    }

    const body = await request.json();
    const { evaluations } = body as { evaluations?: any[] };

    // evaluations format: [{ participation_id, achievement_level, award_type, feedback, bonus_points, penalty_points }]
    if (!evaluations || !Array.isArray(evaluations)) {
      return errorResponse(ApiError.validation('evaluations phải là một mảng'));
    }

    const results = {
      success: [] as any[],
      failed: [] as any[],
    };

    for (const evaluation of evaluations) {
      try {
        const {
          participation_id,
          achievement_level,
          award_type,
          feedback,
          bonus_points = 0,
          penalty_points = 0,
        } = evaluation;

        const normalizedLevel = normalizeAchievementLevel(achievement_level as UiAchievementLevel);

        // Verify participation exists and belongs to this activity
        const participation = (await dbGet(
          `SELECT id, student_id, attendance_status FROM participations 
           WHERE id = ? AND activity_id = ?`,
          [participation_id, activityId]
        )) as any;

        if (!participation) {
          results.failed.push({
            participation_id,
            error: 'Không tìm thấy bản ghi tham gia',
          });
          continue;
        }

        if (String(participation.attendance_status || '') !== 'attended') {
          results.failed.push({
            participation_id,
            error: 'Cần điểm danh đã tham gia trước khi đánh giá',
          });
          continue;
        }

        const points = await withTransaction(async () => {
          await dbRun(
            `UPDATE participations 
             SET achievement_level = ?,
                 feedback = ?,
                 evaluated_at = datetime('now'),
                 evaluated_by = ?,
                 updated_at = datetime('now')
             WHERE id = ?`,
            [normalizedLevel, feedback || null, user.id, participation_id]
          );

          const hasCustomAdjustments = Number(bonus_points || 0) !== 0 || Number(penalty_points || 0) !== 0;
          const calc = hasCustomAdjustments
            ? await PointCalculationService.calculatePoints({
                participationId: participation_id,
                bonusPoints: Number(bonus_points || 0),
                penaltyPoints: Number(penalty_points || 0),
              })
            : await PointCalculationService.autoCalculateAfterEvaluation(participation_id);

          if (hasCustomAdjustments) {
            await PointCalculationService.saveCalculation(participation_id, calc);
          }

          await sendDatabaseNotification({
            userId: Number(participation.student_id),
            type: 'achievement',
            title: 'Đánh giá thành tích',
            message: `Bạn đã được đánh giá "${normalizedLevel}" trong hoạt động "${String(activity.title || '')}" và nhận ${calc.totalPoints.toFixed(2)} điểm.`,
            relatedTable: 'participations',
            relatedId: Number(participation_id),
          });

          return calc.totalPoints;
        });

        results.success.push({
          participation_id,
          student_id: participation.student_id,
          points,
          award_type: award_type || null,
        });
      } catch (error: any) {
        results.failed.push({
          participation_id: evaluation.participation_id,
          error: error.message,
        });
      }
    }

    // Audit log
    await dbRun(
      `INSERT INTO audit_logs (actor_id, action, target_table, target_id, details, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [
        user.id,
        'BATCH_EVALUATE',
        'activities',
        activityId,
        JSON.stringify({
          total: evaluations.length,
          success: results.success.length,
          failed: results.failed.length,
        }),
      ]
    );

    return successResponse(
      results,
      `Đã đánh giá ${results.success.length}/${evaluations.length} lượt tham gia`
    );
  } catch (error: any) {
    console.error('Lỗi đánh giá người tham gia:', error);
    return errorResponse(
      error instanceof ApiError ||
        (error && typeof error.status === 'number' && typeof error.code === 'string')
        ? error
        : ApiError.internalError('Không thể đánh giá người tham gia', { details: error?.message })
    );
  }
}
