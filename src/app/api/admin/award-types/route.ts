import { NextRequest, NextResponse } from 'next/server';
import { dbAll, dbGet, dbRun } from '@/lib/database';
import { getUserFromToken } from '@/lib/auth';

// GET /api/admin/award-types - Get all award types
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const user = await getUserFromToken(token);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
    }

    const awardTypes = await dbAll(
      `SELECT 
        id,
        name,
        description,
        min_points,
        created_at,
        (SELECT COUNT(*) FROM student_awards sa WHERE sa.award_type_id = award_types.id) as award_count
      FROM award_types 
      ORDER BY name ASC`,
      []
    );

    return NextResponse.json({
      success: true,
      data: awardTypes || [],
    });
  } catch (error) {
    console.error('Error getting award types:', error);
    return NextResponse.json({ error: 'Không thể tải danh sách loại khen thưởng' }, { status: 500 });
  }
}

// POST /api/admin/award-types - Create new award type
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const user = await getUserFromToken(token);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, min_points } = body;

    if (!name) {
      return NextResponse.json({ error: 'Thiếu tên loại khen thưởng' }, { status: 400 });
    }

    // Check if name already exists
    const existing = await dbGet('SELECT id FROM award_types WHERE name = ?', [name]);

    if (existing) {
      return NextResponse.json({ error: 'Loại giải thưởng này đã tồn tại' }, { status: 400 });
    }

    // Insert new award type
    const result = await dbRun(
      `INSERT INTO award_types (name, description, min_points)
       VALUES (?, ?, ?)`,
      [name, description || null, min_points || 0]
    );

    // Audit log
    await dbRun(
      `INSERT INTO audit_logs (actor_id, action, target_table, target_id, details, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [
        user.id,
        'CREATE_AWARD_TYPE',
        'award_types',
        result.lastID,
        JSON.stringify({ name, description, min_points }),
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Tạo loại giải thưởng thành công',
      data: { id: result.lastID },
    });
  } catch (error) {
    console.error('Error creating award type:', error);
    return NextResponse.json({ error: 'Không thể tạo loại khen thưởng' }, { status: 500 });
  }
}
