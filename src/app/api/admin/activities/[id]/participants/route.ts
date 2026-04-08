import { NextRequest, NextResponse } from 'next/server';
import { getUserFromSession } from '@/lib/auth';
import { dbAll } from '@/lib/database';
import { formatAttendanceStatus } from '@/lib/formatters';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getUserFromSession();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const activityId = id;

    const participants = await dbAll(
      `SELECT 
        p.id,
        p.student_id as user_id,
        u.name as user_name,
        u.email as user_email,
        c.name as class_name,
        p.created_at as registered_at,
        p.attendance_status as attendance_status,
        p.achievement_level,
        COALESCE(ss.points, 0) as points_earned
      FROM participations p
      JOIN users u ON p.student_id = u.id
      LEFT JOIN classes c ON u.class_id = c.id
      LEFT JOIN student_scores ss ON ss.activity_id = p.activity_id AND ss.student_id = p.student_id
      WHERE p.activity_id = ?
      ORDER BY p.created_at DESC`,
      [activityId]
    );

    const normalizedParticipants = (participants as any[]).map((participant) => ({
      ...participant,
      attendance_status: participant.attendance_status
        ? formatAttendanceStatus(participant.attendance_status)
        : null,
    }));

    return NextResponse.json({ participants: normalizedParticipants });
  } catch (error: any) {
    console.error('Get participants error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
