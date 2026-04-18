import { NextRequest, NextResponse } from 'next/server';
import { dbAll } from '@/lib/database';
import { requireApiRole } from '@/lib/guards';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import { getFinalScoreLedgerByStudentIds } from '@/lib/score-ledger';

type StudentScoreRow = {
  user_id: number;
  name: string;
  email: string;
  class_id: number | null;
  class_name: string | null;
  total_points: number;
  activities_count: number;
  participated_count: number;
  excellent_count: number;
  good_count: number;
  average_count: number;
  awards_count: number;
  award_points: number;
  adjustment_points: number;
  bonus_adjustment_points: number;
  penalty_points: number;
};

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toCsvValue(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

// GET /api/admin/scores - Get all student scores with export option
export async function GET(request: NextRequest) {
  try {
    await requireApiRole(request, ['admin']);

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const classId = searchParams.get('class_id') || '';
    const minPoints = searchParams.get('min_points') || '';
    const exportFormat = searchParams.get('export') || '';

    let query = `
      SELECT 
        u.id as user_id,
        u.name as name,
        u.email as email,
        u.class_id as class_id,
        c.name as class_name,
        COUNT(DISTINCT CASE WHEN p.attendance_status IN ('registered', 'attended') THEN p.activity_id END) as activities_count,
        COUNT(DISTINCT CASE WHEN p.attendance_status = 'attended' THEN p.activity_id END) as participated_count,
        COUNT(DISTINCT CASE WHEN p.attendance_status = 'attended' AND p.achievement_level = 'excellent' THEN p.activity_id END) as excellent_count,
        COUNT(DISTINCT CASE WHEN p.attendance_status = 'attended' AND p.achievement_level = 'good' THEN p.activity_id END) as good_count,
        COUNT(DISTINCT CASE WHEN p.attendance_status = 'attended' AND p.achievement_level = 'average' THEN p.activity_id END) as average_count,
        (SELECT COUNT(*) FROM student_awards sa WHERE sa.student_id = u.id) as awards_count,
        COALESCE((SELECT SUM(ss.points) FROM student_scores ss WHERE ss.student_id = u.id AND ss.source LIKE 'award:%'), 0) as award_points,
        COALESCE((SELECT SUM(ss.points) FROM student_scores ss WHERE ss.student_id = u.id AND ss.source LIKE 'adjustment:%'), 0) as adjustment_points,
        COALESCE((SELECT SUM(ss.points) FROM student_scores ss WHERE ss.student_id = u.id AND ss.source LIKE 'adjustment:%' AND ss.points > 0), 0) as bonus_adjustment_points,
        COALESCE((SELECT SUM(ABS(ss.points)) FROM student_scores ss WHERE ss.student_id = u.id AND ss.source LIKE 'adjustment:%' AND ss.points < 0), 0) as penalty_points
      FROM users u
      LEFT JOIN classes c ON u.class_id = c.id
      LEFT JOIN participations p ON u.id = p.student_id
      WHERE u.role = 'student'
        AND (u.is_active IS NULL OR u.is_active = 1)
    `;

    const params: any[] = [];

    if (search) {
      query += ` AND (u.name LIKE ? OR u.email LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    if (classId) {
      query += ` AND u.class_id = ?`;
      params.push(classId);
    }

    query += ` GROUP BY u.id, u.name, u.email, u.class_id, c.name`;

    const rawScores = ((await dbAll(query, params)) as StudentScoreRow[]).map((score) => ({
      ...score,
      activities_count: toNumber(score.activities_count),
      participated_count: toNumber(score.participated_count),
      excellent_count: toNumber(score.excellent_count),
      good_count: toNumber(score.good_count),
      average_count: toNumber(score.average_count),
      awards_count: toNumber(score.awards_count),
      award_points: toNumber(score.award_points),
      adjustment_points: toNumber(score.adjustment_points),
      bonus_adjustment_points: toNumber(score.bonus_adjustment_points),
      penalty_points: toNumber(score.penalty_points),
    }));

    const ledgers = await getFinalScoreLedgerByStudentIds(rawScores.map((score) => Number(score.user_id)));

    const scores = rawScores
      .map((score) => ({
        ...score,
        total_points: ledgers.get(Number(score.user_id))?.final_total || 0,
      }))
      .filter((score) => !minPoints || score.total_points >= parseInt(minPoints))
      .sort((left, right) => {
        if (right.total_points !== left.total_points) {
          return right.total_points - left.total_points;
        }
        return String(left.name).localeCompare(String(right.name));
      })
      .map((score, index) => ({
        ...score,
        rank: index + 1,
      }));

    const summary = {
      total_students: scores.length,
      average_points:
        scores.length > 0
          ? scores.reduce((sum, score) => sum + score.total_points, 0) / scores.length
          : 0,
      total_award_points: scores.reduce((sum, score) => sum + score.award_points, 0),
      total_bonus_adjustment_points: scores.reduce(
        (sum, score) => sum + score.bonus_adjustment_points,
        0
      ),
      total_penalty_points: scores.reduce((sum, score) => sum + score.penalty_points, 0),
      adjusted_students_count: scores.filter(
        (score) => score.bonus_adjustment_points > 0 || score.penalty_points > 0
      ).length,
      penalized_students_count: scores.filter((score) => score.penalty_points > 0).length,
      rewarded_students_count: scores.filter(
        (score) => score.award_points > 0 || score.bonus_adjustment_points > 0
      ).length,
    };

    const recentAdjustments = (await dbAll(
      `
      SELECT
        ss.id,
        ss.student_id,
        u.name as student_name,
        c.name as class_name,
        ss.points,
        ss.source,
        ss.calculated_at
      FROM student_scores ss
      INNER JOIN users u ON u.id = ss.student_id
      LEFT JOIN classes c ON c.id = u.class_id
      WHERE ss.source LIKE 'adjustment:%'
      ORDER BY datetime(ss.calculated_at) DESC, ss.id DESC
      LIMIT 10
      `
    )) as Array<{
      id: number;
      student_id: number;
      student_name: string;
      class_name: string | null;
      points: number;
      source: string;
      calculated_at: string;
    }>;

    const insights = {
      top_penalty_students: scores
        .filter((score) => score.penalty_points > 0)
        .sort((left, right) => right.penalty_points - left.penalty_points)
        .slice(0, 5),
      top_bonus_students: scores
        .filter((score) => score.bonus_adjustment_points > 0)
        .sort((left, right) => right.bonus_adjustment_points - left.bonus_adjustment_points)
        .slice(0, 5),
      recent_adjustments: recentAdjustments.map((adjustment) => ({
        ...adjustment,
        points: toNumber(adjustment.points),
        adjustment_type: toNumber(adjustment.points) >= 0 ? 'bonus' : 'penalty',
        reason: String(adjustment.source || '').replace(/^adjustment:/, ''),
      })),
    };

    if (exportFormat === 'csv') {
      const rows = [
        [
          'Hạng',
          'Tên',
          'Email',
          'Lớp',
          'Tổng điểm',
          'Hoạt động',
          'Tham gia',
          'Xuất sắc',
          'Tốt',
          'TB',
          'Giải thưởng',
          'Điểm thưởng',
          'Điều chỉnh cộng',
          'Điều chỉnh trừ',
        ],
        ...scores.map((score) => [
          score.rank,
          score.name,
          score.email,
          score.class_name || '',
          score.total_points,
          score.activities_count,
          score.participated_count,
          score.excellent_count,
          score.good_count,
          score.average_count,
          score.awards_count,
          score.award_points,
          score.bonus_adjustment_points,
          score.penalty_points,
        ]),
      ];

      const csv = `\uFEFF${rows
        .map((row) => row.map((value) => toCsvValue(value)).join(','))
        .join('\n')}`;

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="scores-${Date.now()}.csv"`,
        },
      });
    }

    return successResponse({ scores, summary, insights });
  } catch (error: any) {
    console.error('Get scores error:', error);
    const isCanonicalApiError =
      error instanceof ApiError ||
      (error && typeof error.status === 'number' && typeof error.code === 'string');

    return errorResponse(
      isCanonicalApiError
        ? error instanceof ApiError
          ? error
          : new ApiError(
              error.code,
              error.message || 'Không có quyền truy cập',
              error.status,
              error.details
            )
        : ApiError.internalError(error?.message || 'Không thể tải bảng điểm')
    );
  }
}
