import { NextRequest } from 'next/server';
import { requireApiRole } from '@/lib/guards';
import { dbAll } from '@/lib/database';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    const user = await requireApiRole(request, ['student']);

    // Activity type breakdown
    const breakdown = (await dbAll(
      `
      SELECT 
        at.name,
        COUNT(p.id) as count,
        SUM(CASE WHEN p.attendance_status = 'attended' THEN 1 ELSE 0 END) as attended_count
      FROM participations p
      INNER JOIN activities a ON p.activity_id = a.id
      INNER JOIN activity_types at ON a.activity_type_id = at.id
      WHERE p.student_id = ?
      GROUP BY at.id, at.name
      ORDER BY count DESC
    `,
      [user.id]
    )) as any[];

    // Monthly trend (last 6 months)
    const monthlyTrend = (await dbAll(
      `
      SELECT 
        strftime('%m', a.date_time) as month,
        strftime('%Y', a.date_time) as year,
        COUNT(DISTINCT p.id) as count
      FROM participations p
      INNER JOIN activities a ON p.activity_id = a.id
      WHERE p.student_id = ? 
        AND a.date_time >= date('now', '-6 months')
      GROUP BY strftime('%Y-%m', a.date_time)
      ORDER BY a.date_time ASC
    `,
      [user.id]
    )) as any[];

    return successResponse({
      breakdown: breakdown || [],
      monthly: monthlyTrend || [],
    });
  } catch (error) {
    console.error('Activity breakdown error:', error);
    return errorResponse(
      error instanceof ApiError ? error : ApiError.internalError('Internal server error')
    );
  }
}
