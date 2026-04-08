import { NextRequest } from 'next/server';
import { getUserFromSession } from '@/lib/auth';
import { dbAll } from '@/lib/database';
import { ApiError, successResponse, errorResponse } from '@/lib/api-response';

interface ScoreRow {
  participation_points: number | string | null;
  award_points: number | string | null;
  adjustment_points: number | string | null;
}

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function GET(_request: NextRequest) {
  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'admin') {
      return errorResponse(ApiError.unauthorized('Bạn không có quyền truy cập báo cáo điểm.'));
    }

    const rows = (await dbAll(
      `
      SELECT
        u.id as student_id,
        COALESCE(SUM(CASE WHEN p.attendance_status = 'attended' THEN pc.total_points ELSE 0 END), 0) as participation_points,
        COALESCE((SELECT SUM(ss.points) FROM student_scores ss WHERE ss.student_id = u.id AND ss.source LIKE 'award:%'), 0) as award_points,
        COALESCE((SELECT SUM(ss.points) FROM student_scores ss WHERE ss.student_id = u.id AND ss.source LIKE 'adjustment:%'), 0) as adjustment_points
      FROM users u
      LEFT JOIN participations p ON p.student_id = u.id
      LEFT JOIN point_calculations pc ON pc.participation_id = p.id
      WHERE u.role = 'student' AND u.is_active = 1
      GROUP BY u.id
      `
    )) as ScoreRow[];

    const totals = rows
      .map(
        (row) =>
          toNumber(row.participation_points) +
          toNumber(row.award_points) +
          toNumber(row.adjustment_points)
      )
      .sort((a, b) => a - b);

    const stats = {
      average:
        totals.length > 0
          ? (totals.reduce((left, right) => left + right, 0) / totals.length).toFixed(1)
          : 0,
      median: totals.length > 0 ? totals[Math.floor(totals.length / 2)] : 0,
      max: totals.length > 0 ? Math.max(...totals) : 0,
      min: totals.length > 0 ? Math.min(...totals) : 0,
      distribution: [
        { range: '0-100', count: totals.filter((total) => total < 100).length },
        {
          range: '100-200',
          count: totals.filter((total) => total >= 100 && total < 200).length,
        },
        {
          range: '200-300',
          count: totals.filter((total) => total >= 200 && total < 300).length,
        },
        {
          range: '300-400',
          count: totals.filter((total) => total >= 300 && total < 400).length,
        },
        {
          range: '400-500',
          count: totals.filter((total) => total >= 400 && total < 500).length,
        },
        { range: '500+', count: totals.filter((total) => total >= 500).length },
      ],
    };

    return successResponse({ stats });
  } catch (error: unknown) {
    console.error('Score report error:', error);
    return errorResponse(
      ApiError.internalError(
        error instanceof Error ? error.message : 'Không thể tải báo cáo điểm.'
      )
    );
  }
}
