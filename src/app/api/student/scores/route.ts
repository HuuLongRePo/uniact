import { NextRequest } from 'next/server';
import { requireApiRole } from '@/lib/guards';
import { dbAll } from '@/lib/database';
import { cache, CACHE_TTL } from '@/lib/cache';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import { getFinalScoreLedgerByStudentIds } from '@/lib/score-ledger';

type ScoreRow = {
  participation_id: number;
  base_points: number;
  type_multiplier: number;
  level_multiplier: number;
  achievement_multiplier: number;
  subtotal: number;
  bonus_points: number;
  penalty_points: number;
  total_points: number;
  formula: string;
  calculated_at: string;
  evaluated_at: string | null;
  activity_title: string;
  activity_type_name: string | null;
  organization_level_name: string | null;
  achievement_level: string | null;
  award_type: string | null;
};

type ScoreResponseRow = ScoreRow & {
  score: number;
  created_at: string;
};

type ScoreSummary = {
  total_activities: number;
  total_points: number;
  final_total: number;
  activity_points: number;
  award_points: number;
  adjustment_points: number;
  average_points: number;
  excellent_count: number;
  good_count: number;
  participated_count: number;
};

/**
 * GET /api/student/scores
 * Get score history for the logged-in student.
 *
 * Canonical rules:
 * - detailed rows come from point_calculations / participations
 * - summary total comes from the final score ledger
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireApiRole(request, ['student']);
    const limitParam = Number(request.nextUrl?.searchParams.get('limit') || '0');
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 50) : null;

    const cacheKey = `scores:${user.id}:${limit || 'all'}`;

    const result = await cache.get(cacheKey, CACHE_TTL.SCOREBOARD, async () => {
      const scoreRows = (await dbAll(
        `SELECT 
          pc.participation_id,
          COALESCE(pc.base_points, 0) as base_points,
          COALESCE(pc.coefficient, 1) as type_multiplier,
          COALESCE(ol.multiplier, 1) as level_multiplier,
          COALESCE(am.multiplier, 1) as achievement_multiplier,
          (COALESCE(pc.base_points, 0) * COALESCE(pc.coefficient, 1) * COALESCE(ol.multiplier, 1) * COALESCE(am.multiplier, 1)) as subtotal,
          COALESCE(pc.bonus_points, 0) as bonus_points,
          COALESCE(pc.penalty_points, 0) as penalty_points,
          COALESCE(pc.total_points, 0) as total_points,
          ('(' || COALESCE(pc.base_points, 0) || ' x ' || COALESCE(pc.coefficient, 1) || ' x ' || COALESCE(ol.multiplier, 1) || ' x ' || COALESCE(am.multiplier, 1) || ') + ' || COALESCE(pc.bonus_points, 0) || ' - ' || COALESCE(pc.penalty_points, 0) || ' = ' || COALESCE(pc.total_points, 0)) as formula,
          pc.calculated_at,
          p.achievement_level,
          p.evaluated_at,
          NULL as award_type,
          a.title as activity_title,
          at.name as activity_type_name,
          ol.name as organization_level_name
         FROM point_calculations pc
         JOIN participations p ON pc.participation_id = p.id
         JOIN activities a ON p.activity_id = a.id
         LEFT JOIN activity_types at ON a.activity_type_id = at.id
         LEFT JOIN organization_levels ol ON a.organization_level_id = ol.id
         LEFT JOIN achievement_multipliers am ON am.achievement_level = p.achievement_level
         WHERE p.student_id = ?
         ORDER BY COALESCE(p.evaluated_at, pc.calculated_at) DESC, pc.calculated_at DESC`,
        [user.id]
      )) as ScoreRow[];

      const ledger = (await getFinalScoreLedgerByStudentIds([Number(user.id)])).get(Number(user.id));

      const scores: ScoreResponseRow[] = scoreRows.map((row) => ({
        ...row,
        score: Number(row.total_points || 0),
        created_at: row.evaluated_at || row.calculated_at,
      }));

      const visibleScores = limit ? scores.slice(0, limit) : scores;
      const activityPoints = Number(ledger?.participation_points || 0);
      const awardPoints = Number(ledger?.award_points || 0);
      const adjustmentPoints = Number(ledger?.adjustment_points || 0);
      const finalTotal = Number(ledger?.final_total || 0);

      const summary: ScoreSummary = {
        total_activities: scores.length,
        total_points: finalTotal,
        final_total: finalTotal,
        activity_points: activityPoints,
        award_points: awardPoints,
        adjustment_points: adjustmentPoints,
        average_points: scores.length > 0 ? activityPoints / scores.length : 0,
        excellent_count: scores.filter((score) => score.achievement_level === 'excellent').length,
        good_count: scores.filter((score) => score.achievement_level === 'good').length,
        participated_count: scores.filter((score) => score.achievement_level === 'participated')
          .length,
      };

      return { scores: visibleScores, summary };
    });

    return successResponse(result);
  } catch (error: any) {
    console.error('Error fetching student scores:', error);
    return errorResponse(
      error instanceof ApiError ||
        (error && typeof error.status === 'number' && typeof error.code === 'string')
        ? error
        : ApiError.internalError(error.message || 'Khong the tai bang diem hoc vien')
    );
  }
}
