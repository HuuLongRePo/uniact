import { NextRequest, NextResponse } from 'next/server';
import { getUserFromSession } from '@/lib/auth';
import { dbAll } from '@/lib/database';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

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
    const user = await getUserFromSession();
    if (!user) return errorResponse(ApiError.unauthorized('Unauthorized'));
    if (user.role !== 'admin') return errorResponse(ApiError.forbidden('Forbidden'));

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
        COALESCE(SUM(CASE WHEN p.attendance_status IN ('present', 'attended') THEN pc.total_points ELSE 0 END), 0)
          + COALESCE((SELECT SUM(ss.points) FROM student_scores ss WHERE ss.student_id = u.id AND ss.source LIKE 'adjustment:%'), 0)
          as total_points,
        COUNT(DISTINCT CASE WHEN p.attendance_status IN ('registered', 'present', 'attended') THEN p.activity_id END) as activities_count,
        COUNT(DISTINCT CASE WHEN p.attendance_status IN ('present', 'attended') THEN p.activity_id END) as participated_count,
        COUNT(DISTINCT CASE WHEN p.attendance_status IN ('present', 'attended') AND p.achievement_level = 'excellent' THEN p.activity_id END) as excellent_count,
        COUNT(DISTINCT CASE WHEN p.attendance_status IN ('present', 'attended') AND p.achievement_level = 'good' THEN p.activity_id END) as good_count,
        COUNT(DISTINCT CASE WHEN p.attendance_status IN ('present', 'attended') AND p.achievement_level = 'average' THEN p.activity_id END) as average_count,
        (SELECT COUNT(*) FROM student_awards sa WHERE sa.student_id = u.id) as awards_count,
        COALESCE((SELECT SUM(ss.points) FROM student_scores ss WHERE ss.student_id = u.id AND ss.source LIKE 'award:%'), 0) as award_points,
        COALESCE((SELECT SUM(ss.points) FROM student_scores ss WHERE ss.student_id = u.id AND ss.source LIKE 'adjustment:%'), 0) as adjustment_points,
        COALESCE((SELECT SUM(ss.points) FROM student_scores ss WHERE ss.student_id = u.id AND ss.source LIKE 'adjustment:%' AND ss.points > 0), 0) as bonus_adjustment_points,
        COALESCE((SELECT SUM(ABS(ss.points)) FROM student_scores ss WHERE ss.student_id = u.id AND ss.source LIKE 'adjustment:%' AND ss.points < 0), 0) as penalty_points
      FROM users u
      LEFT JOIN classes c ON u.class_id = c.id
      LEFT JOIN participations p ON u.id = p.student_id
      LEFT JOIN point_calculations pc ON pc.participation_id = p.id
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

    if (minPoints) {
      query += ` HAVING total_points >= ?`;
      params.push(parseInt(minPoints));
    }

    query += ` ORDER BY total_points DESC, u.name ASC`;

    const scores = ((await dbAll(query, params)) as StudentScoreRow[]).map((score, index) => ({
      ...score,
      total_points: toNumber(score.total_points),
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
    return errorResponse(ApiError.internalError(error.message || 'Internal server error'));
  }
}
