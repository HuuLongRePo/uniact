import { NextRequest, NextResponse } from 'next/server';
import { getUserFromSession } from '@/lib/auth';
import { dbGet, dbRun } from '@/lib/database';
import { cache } from '@/lib/cache';

// PUT /api/admin/achievement-levels/[id] - Update achievement level
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, multiplier, description } = body;

    // Check if exists
    const existing = await dbGet('SELECT id FROM achievement_levels WHERE id = ?', [id]);
    if (!existing) {
      return NextResponse.json({ error: 'Không tìm thấy mức thành tích' }, { status: 404 });
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
            error: 'Multiplier phải là số dương',
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
      return NextResponse.json({ error: 'Không có trường nào để cập nhật' }, { status: 400 });
    }

    values.push(id);

    await dbRun(`UPDATE achievement_levels SET ${updates.join(', ')} WHERE id = ?`, values);

    // Invalidate cache
    cache.invalidatePrefix('achievement_levels');

    // Audit log
    await dbRun(
      `INSERT INTO audit_logs (actor_id, action, target_table, target_id, details, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [user.id, 'UPDATE', 'achievement_levels', id, JSON.stringify(body)]
    );

    return NextResponse.json({ success: true, message: 'Cập nhật mức thành tích thành công' });
  } catch (error: any) {
    console.error('Error updating achievement level:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/admin/achievement-levels/[id] - Delete achievement level
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
    }

    const { id } = await params;
    // Check if exists
    const existing = await dbGet('SELECT id, name FROM achievement_levels WHERE id = ?', [id]);
    if (!existing) {
      return NextResponse.json({ error: 'Không tìm thấy mức thành tích' }, { status: 404 });
    }

    // Check if used in participations
    const participations = await dbGet(
      'SELECT id FROM participations WHERE achievement_level = ?',
      [id]
    );
    if (participations) {
      return NextResponse.json(
        {
          error:
            'Không thể xóa mức thành tích đang được sử dụng. Vui lòng gán lại dữ liệu tham gia trước.',
        },
        { status: 400 }
      );
    }

    await dbRun('DELETE FROM achievement_levels WHERE id = ?', [id]);

    // Invalidate cache
    cache.invalidatePrefix('achievement_levels');

    // Audit log
    await dbRun(
      `INSERT INTO audit_logs (actor_id, action, target_table, target_id, details, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [user.id, 'DELETE', 'achievement_levels', id, JSON.stringify({ name: existing.name })]
    );

    return NextResponse.json({ success: true, message: 'Xóa mức thành tích thành công' });
  } catch (error: any) {
    console.error('Error deleting achievement level:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
