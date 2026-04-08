import { NextRequest } from 'next/server';
import { dbRun, dbAll } from '@/lib/database';
import { PointCalculationService } from '@/lib/scoring';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

function assertCronSecret(request: NextRequest): ApiError | null {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || 'dev-secret-change-in-production';

  if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return new ApiError('UNAUTHORIZED', 'Invalid or missing CRON_SECRET', 401);
  }

  return null;
}

/**
 * POST /api/cron/complete-activities
 * Auto-complete activities sau date_time + tự động tính điểm
 *
 * Chạy định kỳ (mỗi giờ hoặc mỗi ngày)
 * SECURITY: Requires valid CRON_SECRET header (Bearer token)
 */
export async function POST(request: NextRequest) {
  try {
    const authError = assertCronSecret(request);
    if (authError) {
      console.error('❌ Unauthorized cron request to complete-activities');
      return errorResponse(authError);
    }

    console.warn('🔄 Running auto-complete activities job...');

    // Tìm activities quá hạn (date_time < now) và status = 'published'
    const overdueActivities = await dbAll(`
      SELECT id, title, date_time
      FROM activities
      WHERE status = 'published'
      AND datetime(date_time) < datetime('now')
    `);

    if (overdueActivities.length === 0) {
      console.warn('  ℹ️  No overdue activities found');
      return successResponse({ completed: 0 }, 'No overdue activities');
    }

    console.warn(`  → Found ${overdueActivities.length} overdue activities`);

    // Update status sang 'completed' + auto-calculate điểm
    let completed = 0;
    let pointsCalculated = 0;

    for (const activity of overdueActivities) {
      // 1. Đổi status sang completed
      await dbRun('UPDATE activities SET status = ? WHERE id = ?', ['completed', activity.id]);
      console.warn(`  ✅ Completed: ${activity.title} (${activity.date_time})`);
      completed++;

      // 2. Tự động tính điểm cho tất cả participations có achievement_level
      const participations = await dbAll(
        `
        SELECT id FROM participations
        WHERE activity_id = ?
        AND attendance_status = 'attended'
        AND achievement_level IS NOT NULL
      `,
        [activity.id]
      );

      for (const p of participations) {
        try {
          await PointCalculationService.autoCalculateAfterEvaluation(p.id);
          pointsCalculated++;
        } catch (error) {
          console.error(`    ❌ Failed to calculate points for participation ${p.id}:`, error);
        }
      }

      if (participations.length > 0) {
        console.warn(`    💰 Calculated points for ${participations.length} participations`);
      }
    }

    return successResponse(
      {
        completed,
        pointsCalculated,
        activities: overdueActivities.map((a) => ({ id: a.id, title: a.title })),
      },
      `Auto-completed ${completed} activities, calculated ${pointsCalculated} points`
    );
  } catch (error: any) {
    console.error('Error auto-completing activities:', error);
    return errorResponse(
      error instanceof ApiError
        ? error
        : ApiError.internalError(error.message || 'Failed to complete activities')
    );
  }
}

/**
 * GET /api/cron/complete-activities
 * Check overdue activities (preview mode)
 */
export async function GET(request: NextRequest) {
  try {
    const authError = assertCronSecret(request);
    if (authError) {
      return errorResponse(authError);
    }

    const overdueActivities = await dbAll(`
      SELECT id, title, date_time, status
      FROM activities
      WHERE status = 'published'
      AND datetime(date_time) < datetime('now')
    `);

    return successResponse({ count: overdueActivities.length, activities: overdueActivities });
  } catch (error: any) {
    console.error('Error checking overdue activities:', error);
    return errorResponse(
      error instanceof ApiError
        ? error
        : ApiError.internalError(error.message || 'Failed to check activities')
    );
  }
}
