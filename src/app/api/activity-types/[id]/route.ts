import { NextRequest, NextResponse } from 'next/server';
import { dbHelpers, dbGet, dbRun } from '@/lib/database';
import { getUserFromToken } from '@/lib/auth';

// GET /api/activity-types/:id
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await params;
    const id = parseInt(rawId);

    const activityType = await dbGet('SELECT * FROM activity_types WHERE id = ?', [id]);

    if (!activityType) {
      return NextResponse.json({ error: 'Không tìm thấy loại hoạt động' }, { status: 404 });
    }

    return NextResponse.json({ activityType });
  } catch (error: any) {
    console.error('Get activity type error:', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}

// PUT /api/activity-types/:id - Cập nhật (admin only)
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const user = await getUserFromToken(token);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Chỉ admin mới có quyền cập nhật' }, { status: 403 });
    }

    const { id: rawId } = await params;
    const id = parseInt(rawId);
    const { name, base_points, color } = await request.json();

    const activityType = await dbGet('SELECT * FROM activity_types WHERE id = ?', [id]);

    if (!activityType) {
      return NextResponse.json({ error: 'Không tìm thấy loại hoạt động' }, { status: 404 });
    }

    // Check duplicate name (exclude self)
    if (name && name !== activityType.name) {
      const existing = await dbGet('SELECT id FROM activity_types WHERE name = ? AND id != ?', [
        name,
        id,
      ]);

      if (existing) {
        return NextResponse.json({ error: 'Tên loại hoạt động đã tồn tại' }, { status: 400 });
      }
    }

    await dbRun(
      `UPDATE activity_types 
       SET name = ?, base_points = ?, color = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [
        name || activityType.name,
        base_points !== undefined ? base_points : activityType.base_points,
        color || activityType.color,
        id,
      ]
    );

    await dbHelpers.createAuditLog(
      user.id,
      'UPDATE',
      'activity_types',
      id,
      `Cập nhật loại hoạt động: ${name || activityType.name}`
    );

    return NextResponse.json({ message: 'Cập nhật thành công' });
  } catch (error: any) {
    console.error('Update activity type error:', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}

// DELETE /api/activity-types/:id - Xóa (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const user = await getUserFromToken(token);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Chỉ admin mới có quyền xóa' }, { status: 403 });
    }

    const { id: rawId } = await params;
    const id = parseInt(rawId);

    const activityType = await dbGet('SELECT * FROM activity_types WHERE id = ?', [id]);

    if (!activityType) {
      return NextResponse.json({ error: 'Không tìm thấy loại hoạt động' }, { status: 404 });
    }

    // Check if used by activities
    const usageCount = await dbGet(
      'SELECT COUNT(*) as count FROM activities WHERE activity_type_id = ?',
      [id]
    );

    if (usageCount.count > 0) {
      return NextResponse.json(
        {
          error: `Không thể xóa. Có ${usageCount.count} hoạt động đang sử dụng loại này`,
        },
        { status: 400 }
      );
    }

    await dbRun('DELETE FROM activity_types WHERE id = ?', [id]);

    await dbHelpers.createAuditLog(
      user.id,
      'DELETE',
      'activity_types',
      id,
      `Xóa loại hoạt động: ${activityType.name}`
    );

    return NextResponse.json({ message: 'Xóa thành công' });
  } catch (error: any) {
    console.error('Delete activity type error:', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
