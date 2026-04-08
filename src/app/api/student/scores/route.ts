import { NextRequest, NextResponse } from 'next/server';
import { getUserFromSession } from '@/lib/auth';
import { dbAll } from '@/lib/database';
import { cache, CACHE_TTL } from '@/lib/cache';
import { ApiError, errorResponse } from '@/lib/api-response';

/**
 * GET /api/student/scores
 * Get all score records for the logged-in student
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromSession();
    if (!user) return errorResponse(ApiError.unauthorized('Unauthorized'));
    if (user.role !== 'student') return errorResponse(ApiError.forbidden('Forbidden'));

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
            pc.type_multiplier,
            pc.level_multiplier,
            pc.achievement_multiplier,
            pc.subtotal,
            pc.bonus_points,
            pc.penalty_points,
            pc.total_points,
            pc.formula,
            pc.calculated_at,
             p.achievement_level,
            p.evaluated_at,
            a.title as activity_title,
            at.name as activity_type_name,
            ol.name as organization_level_name
           FROM point_calculations pc
           JOIN participations p ON pc.participation_id = p.id
           JOIN activities a ON p.activity_id = a.id
           JOIN activity_types at ON a.activity_type_id = at.id
           JOIN organization_levels ol ON a.organization_level_id = ol.id
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

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error fetching student scores:', error);
    return errorResponse(ApiError.internalError(error.message || 'Internal server error'));
  }
}
