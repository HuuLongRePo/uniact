import { NextRequest, NextResponse } from 'next/server';
import { getUserFromSession } from '@/lib/auth';
import { dbGet, dbRun } from '@/lib/database';
import { cache } from '@/lib/cache';

// PUT /api/admin/activity-types/[id] - Update activity type
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, multiplier, description } = body;

    // Check if exists
    const existing = await dbGet('SELECT id FROM activity_types WHERE id = ?', [id]);
    if (!existing) {
      return NextResponse.json({ error: 'Activity type not found' }, { status: 404 });
    }

    // Build update query
    const updates: string[] = [];
    const values: any[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (multiplier !== undefined) {
      if (typeof multiplier !== 'number' || multiplier < 0) {
        return NextResponse.json(
          {
            error: 'Multiplier must be a positive number',
          },
          { status: 400 }
        );
      }
      updates.push('multiplier = ?');
      values.push(multiplier);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description || null);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    values.push(id);

    await dbRun(`UPDATE activity_types SET ${updates.join(', ')} WHERE id = ?`, values);

    // Invalidate cache
    cache.invalidatePrefix('activity_types');

    // Audit log
    await dbRun(
      `INSERT INTO audit_logs (actor_id, action, target_table, target_id, details, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [user.id, 'UPDATE', 'activity_types', id, JSON.stringify(body)]
    );

    return NextResponse.json({ success: true, message: 'Activity type updated successfully' });
  } catch (error: any) {
    console.error('Error updating activity type:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/admin/activity-types/[id] - Delete activity type
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    // Check if exists
    const existing = await dbGet('SELECT id, name FROM activity_types WHERE id = ?', [id]);
    if (!existing) {
      return NextResponse.json({ error: 'Activity type not found' }, { status: 404 });
    }

    // Check if used in activities
    const activities = await dbGet('SELECT id FROM activities WHERE activity_type_id = ?', [id]);
    if (activities) {
      return NextResponse.json(
        {
          error: 'Cannot delete activity type that is in use. Please reassign activities first.',
        },
        { status: 400 }
      );
    }

    await dbRun('DELETE FROM activity_types WHERE id = ?', [id]);

    // Invalidate cache
    cache.invalidatePrefix('activity_types');

    // Audit log
    await dbRun(
      `INSERT INTO audit_logs (actor_id, action, target_table, target_id, details, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [user.id, 'DELETE', 'activity_types', id, JSON.stringify({ name: existing.name })]
    );

    return NextResponse.json({ success: true, message: 'Activity type deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting activity type:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
