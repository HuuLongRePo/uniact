import { NextRequest, NextResponse } from 'next/server';
import { dbGet, dbRun } from '@/lib/database';
import { getUserFromToken } from '@/lib/auth';

// GET /api/admin/award-types/:id - Get award type detail
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const user = await getUserFromToken(token);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
    }

    const awardType = await dbGet(
      `SELECT 
        id,
        name,
        description,
        min_points,
        created_at
      FROM award_types 
      WHERE id = ?`,
      [parseInt(id)]
    );

    if (!awardType) {
      return NextResponse.json({ error: 'Không tìm thấy loại giải thưởng' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: awardType,
    });
  } catch (error) {
    console.error('Error getting award type:', error);
    return NextResponse.json({ error: 'Không thể tải loại khen thưởng' }, { status: 500 });
  }
}

// PUT /api/admin/award-types/:id - Update award type
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const user = await getUserFromToken(token);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
    }

    const awardTypeId = parseInt(id);
    const body = await request.json();
    const { name, description, min_points } = body;

    // Check if award type exists
    const existing = await dbGet('SELECT * FROM award_types WHERE id = ?', [awardTypeId]);

    if (!existing) {
      return NextResponse.json({ error: 'Không tìm thấy loại giải thưởng' }, { status: 404 });
    }

    // Check if name already exists (for other records)
    if (name && name !== existing.name) {
      const duplicate = await dbGet('SELECT id FROM award_types WHERE name = ? AND id != ?', [
        name,
        awardTypeId,
      ]);
      if (duplicate) {
        return NextResponse.json({ error: 'Tên loại giải thưởng này đã tồn tại' }, { status: 400 });
      }
    }

    // Update award type
    await dbRun(
      `UPDATE award_types 
       SET name = ?, description = ?, min_points = ?
       WHERE id = ?`,
      [name || existing.name, description || null, min_points || 0, awardTypeId]
    );

    // Audit log
    await dbRun(
      `INSERT INTO audit_logs (actor_id, action, target_table, target_id, details, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [
        user.id,
        'UPDATE_AWARD_TYPE',
        'award_types',
        awardTypeId,
        JSON.stringify({
          old_values: existing,
          new_values: { name, description, min_points },
        }),
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Cập nhật loại giải thưởng thành công',
    });
  } catch (error) {
    console.error('Error updating award type:', error);
    return NextResponse.json({ error: 'Không thể cập nhật loại khen thưởng' }, { status: 500 });
  }
}

// DELETE /api/admin/award-types/:id - Delete award type
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const user = await getUserFromToken(token);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
    }

    const awardTypeId = parseInt(id);

    // Check if award type is used
    const count = await dbGet(
      'SELECT COUNT(*) as count FROM student_awards WHERE award_type_id = ?',
      [awardTypeId]
    );

    if (count && count.count > 0) {
      return NextResponse.json(
        { error: `Không thể xóa - có ${count.count} giải thưởng đang sử dụng loại này` },
        { status: 400 }
      );
    }

    // Delete award type
    await dbRun('DELETE FROM award_types WHERE id = ?', [awardTypeId]);

    // Audit log
    await dbRun(
      `INSERT INTO audit_logs (actor_id, action, target_table, target_id, details, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [
        user.id,
        'DELETE_AWARD_TYPE',
        'award_types',
        awardTypeId,
        JSON.stringify({
          award_type_id: awardTypeId,
        }),
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Xóa loại giải thưởng thành công',
    });
  } catch (error) {
    console.error('Error deleting award type:', error);
    return NextResponse.json({ error: 'Không thể xóa loại khen thưởng' }, { status: 500 });
  }
}
