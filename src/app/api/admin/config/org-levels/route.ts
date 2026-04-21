import { NextRequest, NextResponse } from 'next/server';
import { getUserFromSession } from '@/lib/auth';
import { dbAll, dbRun } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const levels = await dbAll('SELECT * FROM organization_levels ORDER BY point_multiplier DESC');
    return NextResponse.json({ levels });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const { name, point_multiplier, description } = await request.json();

    await dbRun(
      `
      INSERT INTO organization_levels (name, point_multiplier, description)
      VALUES (?, ?, ?)
    `,
      [name, point_multiplier, description || null]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
