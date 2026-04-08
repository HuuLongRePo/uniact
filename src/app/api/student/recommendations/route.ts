import { NextRequest } from 'next/server';
import { dbAll } from '@/lib/database';
import { cache, CACHE_TTL } from '@/lib/cache';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import { requireApiRole } from '@/lib/guards';

type ParticipatedTypeRow = {
  activity_type_id: number | null;
  participation_count: number;
};

type RegisteredActivityRow = {
  activity_id: number;
};

type RecommendationQueryRow = {
  id: number;
  title: string;
  description: string | null;
  date_time: string;
  end_time: string | null;
  location: string | null;
  max_participants: number | null;
  status: string;
  activity_type_name: string | null;
  organization_level_name: string | null;
  base_points: number | null;
  current_participants: number;
  is_preferred_type?: number | boolean;
};

/**
 * GET /api/student/recommendations
 * Get recommended activities for the logged-in student
 *
 * Logic:
 * 1. Analyze student's participation history (activity types they've done)
 * 2. Find popular activities in similar categories
 * 3. Exclude activities the student is already registered for
 * 4. Return top 5 upcoming activities
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireApiRole(request, ['student']);

    const cacheKey = `recommendations:${user.id}`;

    const recommendations = await cache.get(
      cacheKey,
      CACHE_TTL.CLASSES, // 5 minutes - same as classes/activities
      async () => {
        // Get student's activity type preferences based on history
        const participatedTypes = (await dbAll(
          `SELECT 
            a.activity_type_id,
            COUNT(*) as participation_count
           FROM participations p
           JOIN activities a ON p.activity_id = a.id
           WHERE p.student_id = ? AND p.attendance_status IN ('registered', 'attended')
           GROUP BY a.activity_type_id
           ORDER BY participation_count DESC
           LIMIT 3`,
          [user.id]
        )) as ParticipatedTypeRow[];

        const preferredTypeIds = participatedTypes
          .map((participatedType) => participatedType.activity_type_id)
          .filter((activityTypeId): activityTypeId is number => Number.isFinite(activityTypeId));

        // Get activities student is already registered for
        const registeredActivityIds = (await dbAll(
          `SELECT activity_id 
           FROM participations 
           WHERE student_id = ? AND attendance_status IN ('registered', 'attended')`,
          [user.id]
        )) as RegisteredActivityRow[];
        const excludedIds = registeredActivityIds.map((registration) => registration.activity_id);

        // Build recommendation query
        // Prioritize:
        // 1. Activities in preferred types (based on history)
        // 2. Popular activities (high registration count)
        // 3. Upcoming activities (published, date_time in future)
        // 4. Not already registered
        const preferredTypeClause =
          preferredTypeIds.length > 0
            ? `CASE WHEN a.activity_type_id IN (${preferredTypeIds.map(() => '?').join(',')}) THEN 1 ELSE 0 END`
            : '0';

        const excludedClause =
          excludedIds.length > 0
            ? `AND a.id NOT IN (${excludedIds.map(() => '?').join(',')})`
            : '';

        const recommendationsQuery = `SELECT 
            a.id,
            a.title,
            a.description,
            a.date_time,
            a.end_time,
            a.location,
            a.max_participants,
            a.status,
            at.name as activity_type_name,
            ol.name as organization_level_name,
            COALESCE(a.base_points, at.base_points, 0) as base_points,
            (SELECT COUNT(*) FROM participations WHERE activity_id = a.id AND attendance_status IN ('registered', 'attended')) as current_participants,
            ${preferredTypeClause} as is_preferred_type
           FROM activities a
           LEFT JOIN activity_types at ON a.activity_type_id = at.id
           LEFT JOIN organization_levels ol ON a.organization_level_id = ol.id
           WHERE a.status = 'published'
             AND datetime(a.date_time) > datetime('now')
             ${excludedClause}
           ORDER BY 
             is_preferred_type DESC,
             current_participants DESC,
             a.date_time ASC
           LIMIT 5`;

        const recommendationsParams = [...preferredTypeIds, ...excludedIds];

        const recommendations = ((
          await dbAll(recommendationsQuery, recommendationsParams)
        ) as RecommendationQueryRow[]).map((item) => ({
            ...item,
            base_points: Number(item.base_points || 0),
            current_participants: Number(item.current_participants || 0),
            is_preferred_type: Boolean(Number(item.is_preferred_type || 0)),
            reason: Number(item.is_preferred_type || 0)
              ? 'Phù hợp với lịch sử tham gia của bạn'
              : 'Phổ biến trong nhóm hoạt động bạn thường tham gia',
            match_reason: Number(item.is_preferred_type || 0)
              ? 'Phù hợp với lịch sử tham gia của bạn'
              : 'Phổ biến trong nhóm hoạt động bạn thường tham gia',
          })
        );

        // If no recommendations found (new student or no upcoming activities in preferred types),
        // fallback to most popular upcoming activities
        if (recommendations.length === 0) {
          const fallbackExcludedClause =
            excludedIds.length > 0
              ? `AND a.id NOT IN (${excludedIds.map(() => '?').join(',')})`
              : '';

          const fallbackQuery = `SELECT 
              a.id,
              a.title,
              a.description,
              a.date_time,
              a.end_time,
              a.location,
              a.max_participants,
              a.status,
              at.name as activity_type_name,
              ol.name as organization_level_name,
              COALESCE(a.base_points, at.base_points, 0) as base_points,
              (SELECT COUNT(*) FROM participations WHERE activity_id = a.id AND attendance_status IN ('registered', 'attended')) as current_participants
             FROM activities a
             LEFT JOIN activity_types at ON a.activity_type_id = at.id
             LEFT JOIN organization_levels ol ON a.organization_level_id = ol.id
             WHERE a.status = 'published'
               AND datetime(a.date_time) > datetime('now')
               ${fallbackExcludedClause}
             ORDER BY current_participants DESC, a.date_time ASC
             LIMIT 5`;

          const fallbackRecommendations = ((
            await dbAll(fallbackQuery, excludedIds)
          ) as RecommendationQueryRow[]).map((item) => ({
              ...item,
              base_points: Number(item.base_points || 0),
              current_participants: Number(item.current_participants || 0),
              is_preferred_type: false,
              reason: 'Hoạt động được nhiều sinh viên quan tâm',
              match_reason: 'Hoạt động được nhiều sinh viên quan tâm',
            })
          );

          return {
            items: fallbackRecommendations,
            recommendations: fallbackRecommendations,
            reason: 'popular',
            has_history: participatedTypes.length > 0,
          };
        }

        return {
          items: recommendations,
          recommendations,
          reason: 'personalized',
          preferred_types: preferredTypeIds,
          has_history: participatedTypes.length > 0,
        };
      }
    );

    return successResponse(recommendations);
  } catch (error: unknown) {
    console.error('Error fetching recommendations:', error);
    return errorResponse(
      error instanceof ApiError ? error : ApiError.internalError('Không thể lấy gợi ý hoạt động')
    );
  }
}
