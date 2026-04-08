import { NextRequest, NextResponse } from 'next/server';
import { getUserFromSession } from '@/lib/auth';
import { dbAll } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromSession(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');

    const leaderboard = await dbAll(
      `
      SELECT 
        ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(p.points_earned), 0) DESC) as rank,
        u.id as user_id,
        u.name,
        u.email,
        c.name as class_name,
        COALESCE(SUM(p.points_earned), 0) as total_points,
        COUNT(DISTINCT p.activity_id) as activities_count
      FROM users u
      LEFT JOIN classes c ON u.class_id = c.id
      LEFT JOIN participations p ON u.id = p.user_id AND p.attendance_status = 'present'
      WHERE u.role = 'student'
      GROUP BY u.id
      ORDER BY total_points DESC
      LIMIT ?
    `,
      [limit]
    );

    return NextResponse.json({ leaderboard });
  } catch (error: any) {
    console.error('Leaderboard error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
