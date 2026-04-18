import { NextRequest } from 'next/server';
import { requireApiRole } from '@/lib/guards';
import { dbAll } from '@/lib/database';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

type PointsByActivityRow = {
  id: number;
  title: string;
  date_time: string;
  activity_type: string | null;
  organization_level: string | null;
  achievement_level: string | null;
  award_type: string | null;
  base_points: number | null;
  type_multiplier: number | null;
  level_multiplier: number | null;
  achievement_multiplier: number | null;
  subtotal: number | null;
  bonus_points: number | null;
  penalty_points: number | null;
  total_points: number | null;
  evaluated_at: string | null;
};

type AwardRow = {
  id: number;
  award_type: string | null;
  bonus_points: number;
  reason: string | null;
  approved_at: string | null;
  activity_title: string | null;
  approved_by_name: string | null;
};

type PointsSummaryRow = {
  total_base_points: number;
  total_after_multipliers: number;
  total_bonus: number;
  total_penalty: number;
  grand_total: number;
  total_activities: number;
};

// GET /api/student/points-breakdown - Get detailed points breakdown
export async function GET(request: NextRequest) {
  try {
    const user = await requireApiRole(request, ['student']);

    // Points by activity
    const byActivity = (await dbAll(
      `
      SELECT 
        a.id,
        a.title,
        a.date_time,
        at.name as activity_type,
        ol.name as organization_level,
        p.achievement_level,
        NULL as award_type,
        pc.base_points,
        COALESCE(pc.coefficient, 1) as type_multiplier,
        COALESCE(ol.multiplier, 1) as level_multiplier,
        COALESCE(am.multiplier, 1) as achievement_multiplier,
        (COALESCE(pc.base_points, 0) * COALESCE(pc.coefficient, 1) * COALESCE(ol.multiplier, 1) * COALESCE(am.multiplier, 1)) as subtotal,
        pc.bonus_points,
        pc.penalty_points,
        pc.total_points,
        p.evaluated_at
      FROM participations p
      JOIN activities a ON p.activity_id = a.id
      LEFT JOIN activity_types at ON a.activity_type_id = at.id
      LEFT JOIN organization_levels ol ON a.organization_level_id = ol.id
      LEFT JOIN point_calculations pc ON p.id = pc.participation_id
      LEFT JOIN achievement_multipliers am ON am.achievement_level = p.achievement_level
      WHERE p.student_id = ? AND p.attendance_status = 'attended'
      ORDER BY a.date_time DESC
    `,
      [user.id]
    )) as PointsByActivityRow[];

    // Points by activity type
    const byType = await dbAll(
      `
      SELECT 
        at.name as type_name,
        COALESCE(MAX(pc.coefficient), 1) as type_multiplier,
        COUNT(DISTINCT p.id) as activity_count,
        COALESCE(SUM(pc.total_points), 0) as total_points,
        COALESCE(AVG(pc.total_points), 0) as avg_points
      FROM participations p
      JOIN activities a ON p.activity_id = a.id
      LEFT JOIN activity_types at ON a.activity_type_id = at.id
      LEFT JOIN point_calculations pc ON p.id = pc.participation_id
      WHERE p.student_id = ? AND p.attendance_status = 'attended'
      GROUP BY at.id
      ORDER BY total_points DESC
    `,
      [user.id]
    );

    // Points by organization level
    const byLevel = await dbAll(
      `
      SELECT 
        ol.name as level_name,
        ol.multiplier as level_multiplier,
        COUNT(DISTINCT p.id) as activity_count,
        COALESCE(SUM(pc.total_points), 0) as total_points,
        COALESCE(AVG(pc.total_points), 0) as avg_points
      FROM participations p
      JOIN activities a ON p.activity_id = a.id
      LEFT JOIN organization_levels ol ON a.organization_level_id = ol.id
      LEFT JOIN point_calculations pc ON p.id = pc.participation_id
      WHERE p.student_id = ? AND p.attendance_status = 'attended'
      GROUP BY ol.id
      ORDER BY total_points DESC
    `,
      [user.id]
    );

    // Points by achievement level
    const byAchievement = await dbAll(
      `
      SELECT 
        p.achievement_level,
        COUNT(DISTINCT p.id) as activity_count,
        COALESCE(SUM(pc.total_points), 0) as total_points,
        COALESCE(AVG(pc.total_points), 0) as avg_points
      FROM participations p
      LEFT JOIN point_calculations pc ON p.id = pc.participation_id
      WHERE p.student_id = ? 
        AND p.attendance_status = 'attended'
        AND p.achievement_level IS NOT NULL
      GROUP BY p.achievement_level
      ORDER BY total_points DESC
    `,
      [user.id]
    );

    // Awards earned
    const awards = (await dbAll(
      `
      SELECT 
        sa.id,
        at.name as award_type,
        COALESCE((
          SELECT SUM(ss.points)
          FROM student_scores ss
          WHERE ss.student_id = sa.student_id
            AND ss.source = ('award:' || at.name)
        ), 0) as bonus_points,
        sa.reason,
        sa.awarded_at as approved_at,
        NULL as activity_title,
        approver.name as approved_by_name
      FROM student_awards sa
      LEFT JOIN award_types at ON sa.award_type_id = at.id
      LEFT JOIN users approver ON sa.awarded_by = approver.id
      WHERE sa.student_id = ?
      ORDER BY sa.awarded_at DESC
    `,
      [user.id]
    )) as AwardRow[];

    // Total summary
    const summary = (await dbAll(
      `
      SELECT 
        COALESCE(SUM(pc.base_points), 0) as total_base_points,
        COALESCE(SUM(COALESCE(pc.base_points, 0) * COALESCE(pc.coefficient, 1)), 0) as total_after_multipliers,
        COALESCE(SUM(pc.bonus_points), 0) as total_bonus,
        COALESCE(SUM(pc.penalty_points), 0) as total_penalty,
        COALESCE(SUM(pc.total_points), 0) as grand_total,
        COUNT(DISTINCT p.id) as total_activities
      FROM participations p
      LEFT JOIN point_calculations pc ON p.id = pc.participation_id
      WHERE p.student_id = ? AND p.attendance_status = 'attended'
    `,
      [user.id]
    )) as PointsSummaryRow[];

    const totalAwardPoints = awards.reduce(
      (sum, award) => sum + Number(award.bonus_points || 0),
      0
    );

    return successResponse({
      byActivity,
      byType,
      byLevel,
      byAchievement,
      awards,
      summary: {
        ...(summary[0] || {}),
        total_award_points: totalAwardPoints,
        final_total: (summary[0]?.grand_total || 0) + totalAwardPoints,
      },
    });
  } catch (error: any) {
    console.error('Error fetching points breakdown:', error);
    return errorResponse(
      error instanceof ApiError ||
        (error && typeof error.status === 'number' && typeof error.code === 'string')
        ? error
        : ApiError.internalError(
            error instanceof Error ? error.message : 'Không thể tải chi tiết điểm rèn luyện'
          )
    );
  }
}
