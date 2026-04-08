import { NextRequest, NextResponse } from 'next/server';
import { getUserFromSession } from '@/lib/auth';
import { dbGet, dbRun } from '@/lib/database';
import { cache } from '@/lib/cache';

// PUT /api/admin/organization-levels/[id] - Update organization level
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getUserFromSession();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, multiplier, description } = body;

    // Check if exists
    const existing = await dbGet('SELECT id FROM organization_levels WHERE id = ?', [id]);
    if (!existing) {
      return NextResponse.json({ error: 'Organization level not found' }, { status: 404 });
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

    await dbRun(`UPDATE organization_levels SET ${updates.join(', ')} WHERE id = ?`, values);

    // Invalidate cache
    cache.invalidatePrefix('organization_levels');

    // Audit log
    await dbRun(
      `INSERT INTO audit_logs (actor_id, action, target_table, target_id, details, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [user.id, 'UPDATE', 'organization_levels', id, JSON.stringify(body)]
    );

    return NextResponse.json({ success: true, message: 'Organization level updated successfully' });
  } catch (error: any) {
    console.error('Error updating organization level:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/admin/organization-levels/[id] - Delete organization level
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getUserFromSession();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if exists
    const existing = await dbGet('SELECT id, name FROM organization_levels WHERE id = ?', [id]);
    if (!existing) {
      return NextResponse.json({ error: 'Organization level not found' }, { status: 404 });
    }

    // Check if used in activities
    const activities = await dbGet('SELECT id FROM activities WHERE organization_level_id = ?', [
      id,
    ]);
    if (activities) {
      return NextResponse.json(
        {
          error:
            'Cannot delete organization level that is in use. Please reassign activities first.',
        },
        { status: 400 }
      );
    }

    await dbRun('DELETE FROM organization_levels WHERE id = ?', [id]);

    // Invalidate cache
    cache.invalidatePrefix('organization_levels');

    // Audit log
    await dbRun(
      `INSERT INTO audit_logs (actor_id, action, target_table, target_id, details, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [user.id, 'DELETE', 'organization_levels', id, JSON.stringify({ name: existing.name })]
    );

    return NextResponse.json({ success: true, message: 'Organization level deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting organization level:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
