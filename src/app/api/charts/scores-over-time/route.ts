import { NextRequest, NextResponse } from 'next/server';
import { dbAll } from '@/lib/database';
import { ApiError, errorResponse, successResponseWithExtra } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  try {
    const studentId = req.nextUrl.searchParams.get('student_id');
    const daysParam = req.nextUrl.searchParams.get('days');
    const days = Math.min(Math.max(parseInt(daysParam || '30', 10), 1), 180);
    let condition = '';
    const params: any[] = [];
    if (studentId) {
      condition = 'WHERE student_id = ?';
      params.push(studentId);
    }

    const rows = await dbAll(
      `
      SELECT date(calculated_at) as d, SUM(points) as total_points
      FROM student_scores
      ${condition}
      GROUP BY date(calculated_at)
      ORDER BY d DESC
      LIMIT ?
    `,
      [...params, days]
    );

    // Reverse chronological to chronological for chart
    const data = rows.reverse().map((r: any) => ({ date: r.d, points: r.total_points }));
    return successResponseWithExtra(data, { range_days: days, student_id: studentId });
  } catch (err: any) {
    return errorResponse(
      ApiError.internalError('Failed to load scores timeline', { details: err?.message })
    );
  }
}
