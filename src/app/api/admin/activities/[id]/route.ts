import { NextRequest, NextResponse } from 'next/server';
import { dbAll, dbGet, dbReady, dbRun } from '@/lib/database';
import { getUserFromRequest } from '@/lib/guards';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await dbReady();
    const user = await getUserFromRequest(request as any);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const activityId = id;

    const activity = await dbGet(
      `SELECT 
        a.*,
        CASE
          WHEN a.approval_status = 'requested' THEN 'pending'
          WHEN a.approval_status = 'rejected' THEN 'rejected'
          ELSE a.status
        END as status,
        at.name as activity_type_name,
        ol.name as organization_level_name,
        u.name as creator_name
      FROM activities a
      LEFT JOIN activity_types at ON a.activity_type_id = at.id
      LEFT JOIN organization_levels ol ON a.organization_level_id = ol.id
      LEFT JOIN users u ON a.teacher_id = u.id
      WHERE a.id = ?`,
      [activityId]
    );

    if (!activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    return NextResponse.json({ activity });
  } catch (error: any) {
    console.error('Get activity error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await dbReady();
    const user = await getUserFromRequest(request as any);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const activityId = Number(id);
    if (!activityId || Number.isNaN(activityId)) {
      return NextResponse.json({ error: 'Invalid activity ID' }, { status: 400 });
    }

    const body = await request.json();
    const allowedFields = [
      'title',
      'description',
      'date_time',
      'end_time',
      'location',
      'max_participants',
      'activity_type_id',
      'organization_level_id',
    ] as const;

    const updates: Record<string, any> = {};
    for (const key of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(body, key)) {
        updates[key] = body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No changes provided' }, { status: 400 });
    }

    const sets: string[] = [];
    const bindings: any[] = [];
    for (const [key, value] of Object.entries(updates)) {
      sets.push(`${key} = ?`);
      bindings.push(value);
    }
    sets.push('updated_at = CURRENT_TIMESTAMP');

    await dbRun(`UPDATE activities SET ${sets.join(', ')} WHERE id = ?`, [...bindings, activityId]);

    // Audit
    try {
      await dbRun(
        'INSERT INTO audit_logs (actor_id, action, target_table, target_id, details) VALUES (?, ?, ?, ?, ?)',
        [
          user.id,
          'UPDATE_ACTIVITY',
          'activities',
          activityId,
          JSON.stringify({ changes: Object.keys(updates) }),
        ]
      );
    } catch (e) {
      console.error('Failed to write audit log (activities PUT):', e);
    }

    const activity = await dbGet(
      `SELECT 
        a.*,
        CASE
          WHEN a.approval_status = 'requested' THEN 'pending'
          WHEN a.approval_status = 'rejected' THEN 'rejected'
          ELSE a.status
        END as status,
        at.name as activity_type_name,
        ol.name as organization_level_name,
        u.name as creator_name
      FROM activities a
      LEFT JOIN activity_types at ON a.activity_type_id = at.id
      LEFT JOIN organization_levels ol ON a.organization_level_id = ol.id
      LEFT JOIN users u ON a.teacher_id = u.id
      WHERE a.id = ?`,
      [activityId]
    );

    return NextResponse.json({ activity });
  } catch (error: any) {
    console.error('Update activity error (admin):', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await dbReady();
    const user = await getUserFromRequest(request as any);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const activityId = id;

    // Soft delete
    await dbRun(
      `UPDATE activities 
       SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [activityId]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete activity error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
