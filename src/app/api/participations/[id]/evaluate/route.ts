import { NextRequest } from 'next/server';
import { dbRun, dbGet, withTransaction } from '@/lib/database';
import { PointCalculationService } from '@/lib/scoring';
import { requireApiRole } from '@/lib/guards';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

/**
 * POST /api/participations/[id]/evaluate
 * Đánh giá achievement level cho participation
 * Auto-trigger calculate points
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireApiRole(request, ['admin', 'teacher']);

    const participationId = parseInt(id);
    const body = await request.json();
    const achievementLevel = body?.achievementLevel ?? body?.achievement_level;
    const feedback = body?.feedback;
    const bonusPoints = body?.bonusPoints ?? body?.bonus_points;
    const penaltyPoints = body?.penaltyPoints ?? body?.penalty_points;
    const awardType = body?.awardType ?? body?.award_type;

    const validLevels = ['excellent', 'good', 'participated'];
    if (!achievementLevel || !validLevels.includes(achievementLevel)) {
      return errorResponse(
        ApiError.validation('Mức đánh giá không hợp lệ. Phải là: excellent, good, hoặc participated')
      );
    }

    const participation = await dbGet('SELECT * FROM participations WHERE id = ?', [
      participationId,
    ]);

    if (!participation) {
      return errorResponse(ApiError.notFound('Không tìm thấy bản ghi tham gia'));
    }

    if (participation.attendance_status !== 'attended') {
      return errorResponse(ApiError.validation('Chỉ có thể đánh giá các lượt tham gia đã điểm danh'));
    }

    const result = await withTransaction(async () => {
      await dbRun(
        `UPDATE participations 
         SET achievement_level = ?,
             feedback = ?,
             evaluated_at = CURRENT_TIMESTAMP,
             evaluated_by = ?
         WHERE id = ?`,
        [achievementLevel, feedback || null, user.id, participationId]
      );

      let totalBonusPoints = bonusPoints || 0;
      if (awardType) {
        const awardBonus = (await dbGet(
          'SELECT award_type, bonus_points, description FROM award_bonuses WHERE award_type = ?',
          [awardType]
        )) as any;

        if (awardBonus) {
          totalBonusPoints += awardBonus.bonus_points;

          const awardTypeName = (awardBonus.description ||
            awardBonus.award_type ||
            awardType) as string;
          await dbRun('INSERT OR IGNORE INTO award_types (name, description, min_points) VALUES (?, ?, 0)', [
            awardTypeName,
            `Award bonus (${awardType})`,
          ]);

          const resolvedAwardType = (await dbGet(
            'SELECT id FROM award_types WHERE name = ? LIMIT 1',
            [awardTypeName]
          )) as any;

          if (resolvedAwardType?.id) {
            const activity = (await dbGet('SELECT title FROM activities WHERE id = ?', [
              participation.activity_id,
            ])) as any;

            await dbRun(
              `INSERT INTO student_awards (student_id, award_type_id, awarded_by, awarded_at, reason)
               VALUES (?, ?, ?, datetime('now'), ?)`,
              [
                participation.student_id,
                resolvedAwardType.id,
                user.id,
                `Đạt giải "${awardTypeName}" trong hoạt động: ${activity?.title || ''}`,
              ]
            );
          }
        }
      }

      const calculationResult = await PointCalculationService.calculatePoints({
        participationId,
        bonusPoints: totalBonusPoints,
        penaltyPoints: penaltyPoints || 0,
      });

      await PointCalculationService.saveCalculation(participationId, calculationResult);

      await dbRun(
        `INSERT INTO notifications (user_id, type, title, message, related_table, related_id, is_read)
         VALUES (?, 'achievement', ?, ?, 'participations', ?, 0)`,
        [
          participation.student_id,
          'Đánh giá thành tích',
          `Bạn đã được đánh giá "${achievementLevel}" và nhận ${calculationResult.totalPoints.toFixed(2)} điểm`,
          participationId,
        ]
      );

      await dbRun(
        `INSERT INTO audit_logs (actor_id, action, target_table, target_id, details)
         VALUES (?, 'evaluate_achievement', 'participations', ?, ?)`,
        [
          user.id,
          participationId,
          JSON.stringify({ achievementLevel, awardType, points: calculationResult.totalPoints }),
        ]
      );

      return calculationResult;
    });

    const evaluatedAt = new Date().toISOString();

    return successResponse(
      {
        participation: {
          id: participationId,
          achievementLevel,
          achievement_level: achievementLevel,
          feedback,
          awardType: awardType || null,
          award_type: awardType || null,
          evaluatedAt,
          evaluated_at: evaluatedAt,
          evaluatedBy: user.id,
          evaluated_by: user.id,
        },
        points: result,
      },
      `Đã đánh giá ${achievementLevel} và tính ${result.totalPoints} điểm.`
    );
  } catch (error: any) {
    console.error('Error evaluating participation:', error);
    return errorResponse(
      error instanceof ApiError ||
        (error && typeof error.status === 'number' && typeof error.code === 'string')
        ? error
        : ApiError.internalError('Không thể đánh giá lượt tham gia', { details: error?.message })
    );
  }
}

/**
 * GET /api/participations/[id]/evaluate
 * Lấy thông tin evaluation
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireApiRole(request, ['admin', 'teacher', 'student']);

    const { id } = await params;
    const participationId = parseInt(id);

    const participation = await dbGet(
      `SELECT 
        p.*,
        u.name as student_name,
        ev.name as evaluator_name,
        pc.total_points,
        pc.formula
       FROM participations p
       LEFT JOIN users u ON p.student_id = u.id
       LEFT JOIN users ev ON p.evaluated_by = ev.id
       LEFT JOIN point_calculations pc ON pc.participation_id = p.id
       WHERE p.id = ?`,
      [participationId]
    );

    if (!participation) {
      return errorResponse(ApiError.notFound('Không tìm thấy bản ghi tham gia'));
    }

    return successResponse({ participation });
  } catch (error: any) {
    console.error('Error getting evaluation:', error);
    return errorResponse(
      error instanceof ApiError ||
        (error && typeof error.status === 'number' && typeof error.code === 'string')
        ? error
        : ApiError.internalError('Không thể lấy thông tin đánh giá', { details: error?.message })
    );
  }
}
