import { NextRequest } from 'next/server';
import { requireApiRole } from '@/lib/guards';
import { dbAll } from '@/lib/database';
import { cache, CACHE_TTL } from '@/lib/cache';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

/**
 * GET /api/student/scores
 * Get all score records for the logged-in student
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireApiRole(request, ['student']);

    // Cache với key theo student_id
    const cacheKey = `scores:${user.id}`;

    const result = await cache.get(
      cacheKey,
      CACHE_TTL.SCOREBOARD, // 1 minute - vì scores có thể thay đổi thường xuyên
      async () => {
        // Get all score calculations
        const scores = await dbAll(
          `SELECT 
            pc.participation_id,
            pc.base_points,
            COALESCE(pc.coefficient, 1) as type_multiplier,
            COALESCE(ol.multiplier, 1) as level_multiplier,
            COALESCE(am.multiplier, 1) as achievement_multiplier,
            (COALESCE(pc.base_points, 0) * COALESCE(pc.coefficient, 1) * COALESCE(ol.multiplier, 1) * COALESCE(am.multiplier, 1)) as subtotal,
            pc.bonus_points,
            pc.penalty_points,
            pc.total_points,
            ('(' || COALESCE(pc.base_points, 0) || ' × ' || COALESCE(pc.coefficient, 1) || ' × ' || COALESCE(ol.multiplier, 1) || ' × ' || COALESCE(am.multiplier, 1) || ') + ' || COALESCE(pc.bonus_points, 0) || ' - ' || COALESCE(pc.penalty_points, 0) || ' = ' || COALESCE(pc.total_points, 0)) as formula,
            pc.calculated_at,
            p.achievement_level,
            p.evaluated_at,
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
           ORDER BY pc.calculated_at DESC`,
          [user.id]
        );

        // Calculate summary
        const summary = {
          total_activities: scores.length,
          total_points: scores.reduce((sum, s) => sum + s.total_points, 0),
          average_points:
            scores.length > 0
              ? scores.reduce((sum, s) => sum + s.total_points, 0) / scores.length
              : 0,
          excellent_count: scores.filter((s) => s.achievement_level === 'excellent').length,
          good_count: scores.filter((s) => s.achievement_level === 'good').length,
          participated_count: scores.filter((s) => s.achievement_level === 'participated').length,
        };

        return { scores, summary };
      }
    );

    return successResponse(result);
  } catch (error: any) {
    console.error('Error fetching student scores:', error);
    return errorResponse(
      error instanceof ApiError ||
        (error && typeof error.status === 'number' && typeof error.code === 'string')
        ? error
        : ApiError.internalError(error.message || 'Không thể tải điểm học viên')
    );
  }
}
