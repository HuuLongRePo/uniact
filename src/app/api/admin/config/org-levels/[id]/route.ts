import { NextRequest, NextResponse } from 'next/server';
import { getUserFromSession } from '@/lib/auth';
import { dbRun, dbGet } from '@/lib/database';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getUserFromSession();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const { name, point_multiplier, description } = await request.json();

    await dbRun(
      `
      UPDATE organization_levels 
      SET name = ?, point_multiplier = ?, description = ?
      WHERE id = ?
    `,
      [name, point_multiplier, description || null, id]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getUserFromSession();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    await dbRun('DELETE FROM organization_levels WHERE id = ?', [id]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
