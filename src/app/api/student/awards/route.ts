import { NextRequest, NextResponse } from 'next/server';
import { getUserFromSession } from '@/lib/auth';
import { dbAll } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromSession();
    if (!user) return NextResponse.json({ error: 'Chua dang nhap' }, { status: 401 });
    if (user.role !== 'student') {
      return NextResponse.json({ error: 'Khong co quyen truy cap' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const typeFilter = searchParams.get('type');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const conditions: string[] = ['sa.student_id = ?'];
    const params: Array<string | number> = [user.id];

    if (typeFilter) {
      conditions.push('LOWER(at.name) = LOWER(?)');
      params.push(typeFilter);
    }
    if (from) {
      conditions.push('date(sa.awarded_at) >= date(?)');
      params.push(from);
    }
    if (to) {
      conditions.push('date(sa.awarded_at) <= date(?)');
      params.push(to);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const awards = await dbAll(
      `SELECT
        sa.id,
        sa.reason,
        sa.awarded_at,
        at.name AS award_type_name,
        at.description AS award_type_description,
        u.name AS awarded_by_name
      FROM student_awards sa
      LEFT JOIN award_types at ON sa.award_type_id = at.id
      LEFT JOIN users u ON sa.awarded_by = u.id
      ${whereClause}
      ORDER BY sa.awarded_at DESC`,
      params
    );

    const summary = await dbAll(
      `SELECT
        at.name AS award_type_name,
        COUNT(sa.id) AS total_awards,
        MIN(sa.awarded_at) AS first_awarded_at,
        MAX(sa.awarded_at) AS last_awarded_at
      FROM student_awards sa
      LEFT JOIN award_types at ON sa.award_type_id = at.id
      WHERE sa.student_id = ?
      GROUP BY at.id
      ORDER BY total_awards DESC`,
      [user.id]
    );

    return NextResponse.json({ success: true, data: { awards, summary } });
  } catch (error: any) {
    console.error('Error fetching student awards:', error);
    return NextResponse.json({ error: error?.message || 'Khong the tai danh sach khen thuong' }, { status: 500 });
  }
}
