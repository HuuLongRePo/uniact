import { NextRequest, NextResponse } from 'next/server';
import { dbRun, dbGet, withTransaction } from '@/lib/database';
import { PointCalculationService } from '@/lib/scoring';
import { getUserFromSession } from '@/lib/auth';

/**
 * POST /api/participations/[id]/evaluate
 * Đánh giá achievement level cho participation
 * Auto-trigger calculate points
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getUserFromSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Chỉ teacher và admin mới được evaluate
    if (!['admin', 'teacher', 'department_head'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const participationId = parseInt(id);
    const body = await request.json();
    const achievementLevel = body?.achievementLevel ?? body?.achievement_level;
    const feedback = body?.feedback;
    const bonusPoints = body?.bonusPoints ?? body?.bonus_points;
    const penaltyPoints = body?.penaltyPoints ?? body?.penalty_points;
    const awardType = body?.awardType ?? body?.award_type;

    // Validate achievement level
    const validLevels = ['excellent', 'good', 'participated'];
    if (!achievementLevel || !validLevels.includes(achievementLevel)) {
      return NextResponse.json(
        { error: 'Invalid achievement level. Must be: excellent, good, or participated' },
        { status: 400 }
      );
    }

    // Check participation exists và đã attended
    const participation = await dbGet('SELECT * FROM participations WHERE id = ?', [
      participationId,
    ]);

    if (!participation) {
      return NextResponse.json({ error: 'Participation not found' }, { status: 404 });
    }

    if (participation.attendance_status !== 'attended') {
      return NextResponse.json(
        { error: 'Can only evaluate attended participations' },
        { status: 400 }
      );
    }

    // 🔒 TRANSACTION: All evaluation operations must succeed together
    const result = await withTransaction(async () => {
      // Update participation với achievement level
      await dbRun(
        `UPDATE participations 
         SET achievement_level = ?,
             feedback = ?,
             evaluated_at = CURRENT_TIMESTAMP,
             evaluated_by = ?
         WHERE id = ?`,
        [achievementLevel, feedback || null, user.id, participationId]
      );

      // Xử lý award nếu có
      let totalBonusPoints = bonusPoints || 0;
      if (awardType) {
        const awardBonus = (await dbGet(
          'SELECT award_type, bonus_points, description FROM award_bonuses WHERE award_type = ?',
          [awardType]
        )) as any;

        if (awardBonus) {
          totalBonusPoints += awardBonus.bonus_points;

          // Ensure award_types row exists for this award_bonuses entry (best-effort)
          const awardTypeName = (awardBonus.description ||
            awardBonus.award_type ||
            awardType) as string;
          await dbRun(
            'INSERT OR IGNORE INTO award_types (name, description, min_points) VALUES (?, ?, 0)',
            [awardTypeName, `Award bonus (${awardType})`]
          );

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

      // 🔥 AUTO-TRIGGER CALCULATE POINTS
      console.warn(`🎯 Evaluating participation ${participationId} as ${achievementLevel}`);
      const calculationResult = await PointCalculationService.calculatePoints({
        participationId,
        bonusPoints: totalBonusPoints,
        penaltyPoints: penaltyPoints || 0,
      });

      // Save calculation
      await PointCalculationService.saveCalculation(participationId, calculationResult);

      // Send notification to student
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

      // Audit log
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

    return NextResponse.json({
      success: true,
      data: {
        participation: {
          id: participationId,
          achievementLevel,
          feedback,
          awardType: awardType || null,
          evaluatedAt: new Date().toISOString(),
          evaluatedBy: user.id,
        },
        points: result,
      },
      message: `Evaluated as ${achievementLevel}. Calculated ${result.totalPoints} points.`,
    });
  } catch (error: any) {
    console.error('Error evaluating participation:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to evaluate participation' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/participations/[id]/evaluate
 * Lấy thông tin evaluation
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getUserFromSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
      return NextResponse.json({ error: 'Participation not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: participation,
    });
  } catch (error: any) {
    console.error('Error getting evaluation:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get evaluation' },
      { status: 500 }
    );
  }
}
