import { NextRequest, NextResponse } from 'next/server';
import { dbHelpers, dbAll, dbGet, dbRun } from '@/lib/database';
import { getUserFromToken } from '@/lib/auth';

// GET /api/activity-types - Lấy danh sách loại hoạt động
export async function GET(request: NextRequest) {
  try {
    const activityTypes = await dbAll('SELECT * FROM activity_types ORDER BY name');

    return NextResponse.json({
      activityTypes,
      activity_types: activityTypes,
      types: activityTypes,
    });
  } catch (error: any) {
    console.error('Get activity types error:', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}

// POST /api/activity-types - Tạo loại hoạt động mới (admin only)
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const user = await getUserFromToken(token);
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Chỉ admin mới có quyền tạo loại hoạt động' },
        { status: 403 }
      );
    }

    const { name, base_points, color } = await request.json();

    if (!name || !base_points) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
    }

    // Check duplicate name
    const existing = await dbGet('SELECT id FROM activity_types WHERE name = ?', [name]);

    if (existing) {
      return NextResponse.json({ error: 'Tên loại hoạt động đã tồn tại' }, { status: 400 });
    }

    const result = await dbRun(
      `INSERT INTO activity_types (name, base_points, color, created_at)
       VALUES (?, ?, ?, datetime('now'))`,
      [name, base_points, color || '#3B82F6']
    );

    await dbHelpers.createAuditLog(
      user.id,
      'CREATE',
      'activity_types',
      result.lastID,
      `Tạo loại hoạt động: ${name}`
    );

    return NextResponse.json(
      {
        message: 'Tạo loại hoạt động thành công',
        id: result.lastID,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create activity type error:', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
