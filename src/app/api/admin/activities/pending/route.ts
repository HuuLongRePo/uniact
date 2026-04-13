/**
 * Get Pending Activity Approvals
 * GET /api/admin/activities/pending
 *
 * Admin views all activities pending approval
 */

import { NextRequest } from 'next/server';
import { dbAll, dbReady } from '@/lib/database';
import { requireApiRole } from '@/lib/guards';
import { getActivityDisplayStatus } from '@/lib/activity-workflow';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    await dbReady();
    await requireApiRole(request, ['admin']);

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20));
    const offset = (page - 1) * limit;

    const activities = (await dbAll(
      `SELECT 
        a.*,
        u.name as creator_name,
        u.name as teacher_name,
        u.email as teacher_email,
        c.name as organization_level_name,
        t.name as activity_type_name,
        (SELECT COUNT(*) FROM participations p WHERE p.activity_id = a.id) as participant_count
      FROM activities a
      LEFT JOIN users u ON a.teacher_id = u.id
      LEFT JOIN organization_levels c ON a.organization_level_id = c.id
      LEFT JOIN activity_types t ON a.activity_type_id = t.id
      WHERE a.approval_status = 'requested'
      ORDER BY COALESCE(a.submitted_at, a.created_at) DESC
      LIMIT ? OFFSET ?`,
      [limit, offset]
    )) as any[];

    const normalizedActivities = (activities || []).map((activity) => ({
      ...activity,
      status: getActivityDisplayStatus(activity.status, activity.approval_status),
    }));

    const countResult = (await dbAll(
      `SELECT COUNT(*) as total FROM activities WHERE approval_status = 'requested'`,
      []
    )) as any[];

    const total = Number(countResult[0]?.total || 0);

    return successResponse({
      activities: normalizedActivities,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Get pending approvals error:', error);
    return errorResponse(
      error instanceof ApiError ||
        (error && typeof error.status === 'number' && typeof error.code === 'string')
        ? error
        : ApiError.internalError('Không thể tải danh sách chờ phê duyệt', {
            details: error?.message,
          })
    );
  }
}
