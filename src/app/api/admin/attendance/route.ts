import { NextRequest, NextResponse } from 'next/server';
import { getUserFromSession } from '@/lib/auth';
import { dbAll } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromSession(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const records = await dbAll(`
      SELECT
        ar.id,
        ar.activity_id as activityId,
        act.title as activityName,
        act.date_time as activityDate,
        ar.student_id as userId,
        u.name as userName,
        u.email as userEmail,
        CASE
          WHEN ar.status IN ('present', 'absent', 'late') THEN ar.status
          ELSE 'present'
        END as status,
        0 as pointsAwarded
      FROM attendance_records ar
      JOIN activities act ON ar.activity_id = act.id
      JOIN users u ON ar.student_id = u.id
      ORDER BY act.date_time DESC, u.name ASC
    `);

    return NextResponse.json({ records });
  } catch (error) {
    console.error('Get attendance error:', error);
    return NextResponse.json({ error: 'Failed to fetch attendance' }, { status: 500 });
  }
}
