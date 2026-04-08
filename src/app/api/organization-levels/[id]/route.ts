import { NextRequest, NextResponse } from 'next/server';
import { dbHelpers, dbGet, dbRun } from '@/lib/database';
import { getUserFromToken } from '@/lib/auth';

// GET /api/organization-levels/:id
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: paramId } = await params;
    const id = parseInt(paramId);
    const level = await dbGet('SELECT * FROM organization_levels WHERE id = ?', [id]);
    if (!level) return NextResponse.json({ error: 'Không tìm thấy cấp độ' }, { status: 404 });
    return NextResponse.json({ organization_level: level });
  } catch (error: any) {
    console.error('Get organization level error:', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}

// PUT /api/organization-levels/:id - Cập nhật (admin only)
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: paramId } = await params;
    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = await getUserFromToken(token);
    if (!user || user.role !== 'admin')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const id = parseInt(paramId);
    const existing = await dbGet('SELECT * FROM organization_levels WHERE id = ?', [id]);
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy cấp độ' }, { status: 404 });

    const { name, multiplier, description } = await request.json();

    // Check duplicate name
    if (name && name !== existing.name) {
      const dup = await dbGet('SELECT id FROM organization_levels WHERE name = ? AND id != ?', [
        name,
        id,
      ]);
      if (dup) return NextResponse.json({ error: 'Tên cấp độ đã tồn tại' }, { status: 400 });
    }

    await dbRun(
      `UPDATE organization_levels SET name = ?, multiplier = ?, description = ? WHERE id = ?`,
      [
        name || existing.name,
        multiplier !== undefined ? multiplier : existing.multiplier,
        description !== undefined ? description : existing.description,
        id,
      ]
    );

    await dbHelpers.createAuditLog(
      user.id,
      'UPDATE',
      'organization_levels',
      id,
      `Cập nhật cấp độ: ${name || existing.name}`
    );
    return NextResponse.json({ message: 'Cập nhật thành công' });
  } catch (error: any) {
    console.error('Update organization level error:', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}

// DELETE /api/organization-levels/:id - Xóa (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: paramId } = await params;
    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = await getUserFromToken(token);
    if (!user || user.role !== 'admin')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const id = parseInt(paramId);
    const existing = await dbGet('SELECT * FROM organization_levels WHERE id = ?', [id]);
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy cấp độ' }, { status: 404 });

    // Optional: Check usage if we later link levels to activities
    await dbRun('DELETE FROM organization_levels WHERE id = ?', [id]);
    await dbHelpers.createAuditLog(
      user.id,
      'DELETE',
      'organization_levels',
      id,
      `Xóa cấp độ: ${existing.name}`
    );
    return NextResponse.json({ message: 'Xóa thành công' });
  } catch (error: any) {
    console.error('Delete organization level error:', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
