import { NextRequest, NextResponse } from 'next/server';
import { dbRun, dbGet, dbAll } from '@/lib/database';
import { getUserFromSession } from '@/lib/auth';
import { PointCalculationService } from '@/lib/scoring';

/**
 * POST /api/admin/activities/[id]/complete
 * Đánh dấu hoạt động hoàn thành + tự động tính điểm cho tất cả participations
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getUserFromSession();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin' && user.role !== 'teacher') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Kiểm tra activity
    const activity = await dbGet('SELECT * FROM activities WHERE id = ?', [id]);
    if (!activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    if (activity.status === 'completed') {
      return NextResponse.json({ error: 'Activity already completed' }, { status: 400 });
    }

    if (activity.status === 'cancelled') {
      return NextResponse.json({ error: 'Cannot complete cancelled activity' }, { status: 400 });
    }

    // 1. Đổi status sang completed
    await dbRun('UPDATE activities SET status = ? WHERE id = ?', ['completed', id]);

    // 2. Tự động tính điểm cho tất cả participations có achievement_level
    const participations = await dbAll(
      `
      SELECT id, student_id, achievement_level
      FROM participations
      WHERE activity_id = ?
      AND attendance_status = 'attended'
      AND achievement_level IS NOT NULL
    `,
      [id]
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

    // 3. Audit log
    await dbRun(
      `INSERT INTO audit_logs (actor_id, action, target_table, target_id, details)
       VALUES (?, 'COMPLETE_ACTIVITY', 'activities', ?, ?)`,
      [
        user.id,
        id,
        `Completed activity "${activity.title}" and calculated ${pointsCalculated} points`,
      ]
    );

    return NextResponse.json({
      success: true,
      message: `Activity completed successfully. Calculated ${pointsCalculated}/${participations.length} points.`,
      activity: {
        id: activity.id,
        title: activity.title,
        status: 'completed',
      },
      pointsCalculated,
      totalParticipations: participations.length,
      results,
    });
  } catch (error: any) {
    console.error('Error completing activity:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to complete activity' },
      { status: 500 }
    );
  }
}
