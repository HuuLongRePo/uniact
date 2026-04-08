import { NextRequest, NextResponse } from 'next/server';
import { dbHelpers, dbGet, dbRun } from '@/lib/database';
import { getUserFromToken } from '@/lib/auth';

// GET /api/organization-levels - Danh sách cấp độ tổ chức
export async function GET(request: NextRequest) {
  try {
    const levels = await dbHelpers.getOrganizationLevels();
    return NextResponse.json({
      organization_levels: levels,
      levels,
    });
  } catch (error: any) {
    console.error('Get organization levels error:', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}

// POST /api/organization-levels - Tạo mới (admin only)
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await getUserFromToken(token);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Chỉ admin mới được tạo cấp độ' }, { status: 403 });
    }

    const { name, multiplier, description } = await request.json();
    if (!name || multiplier === undefined) {
      return NextResponse.json({ error: 'Thiếu tên hoặc multiplier' }, { status: 400 });
    }

    // Kiểm tra trùng tên
    const existing = await dbGet('SELECT id FROM organization_levels WHERE name = ?', [name]);
    if (existing) {
      return NextResponse.json({ error: 'Tên cấp độ đã tồn tại' }, { status: 400 });
    }

    const result = await dbRun(
      `INSERT INTO organization_levels (name, multiplier, description, created_at) VALUES (?, ?, ?, datetime('now'))`,
      [name, multiplier, description || null]
    );

    await dbHelpers.createAuditLog(
      user.id,
      'CREATE',
      'organization_levels',
      result.lastID || null,
      `Tạo cấp độ tổ chức: ${name}`
    );

    return NextResponse.json(
      { message: 'Tạo cấp độ thành công', id: result.lastID },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create organization level error:', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
