/**
 * Get Pending Activity Approvals
 * GET /api/admin/activities/pending
 *
 * Admin views all activities pending approval
 */

import { NextRequest, NextResponse } from 'next/server';
import { dbAll, dbReady } from '@/lib/database';
import { getUserFromRequest } from '@/lib/guards';
import { getActivityDisplayStatus } from '@/lib/activity-workflow';

export async function GET(request: NextRequest) {
  try {
    await dbReady();
    const user = await getUserFromRequest(request as any);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Pending approvals: activities waiting for admin review (approval_status='requested')
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

    // Get total count
    const countResult = (await dbAll(
      `SELECT COUNT(*) as total FROM activities WHERE approval_status = 'requested'`,
      []
    )) as any[];

    const total = countResult[0]?.total || 0;

    return NextResponse.json({
      success: true,
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
    return NextResponse.json(
      { error: error.message || 'Failed to get pending approvals' },
      { status: 500 }
    );
  }
}
