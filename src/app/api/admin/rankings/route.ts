import { NextRequest } from 'next/server';
import { dbAll, dbGet } from '@/lib/database';
import { requireApiRole } from '@/lib/guards';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import { getFinalScoreLedgerByStudentIds } from '@/lib/score-ledger';

interface RankingRecord {
  rank: number;
  student_id: number;
  student_name: string;
  student_email: string;
  class_name: string;
  class_id: number;
  total_points: number;
  activity_count: number;
  award_count: number;
  avg_points: string | number;
}

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function GET(req: NextRequest) {
  try {
    await requireApiRole(req, ['admin']);

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25', 10) || 25));
    const classId = searchParams.get('class_id') ? parseInt(searchParams.get('class_id')!) : null;
    const orgLevelId = searchParams.get('org_level_id')
      ? parseInt(searchParams.get('org_level_id')!)
      : null;
    const dateFrom = searchParams.get('date_from') || null;
    const dateTo = searchParams.get('date_to') || null;
    const sortBy = searchParams.get('sort_by') || 'total_points'; // total_points, activity_count, award_count

    const offset = (page - 1) * limit;

    const studentFilters = [
      "u.role = 'student'",
      'COALESCE(u.is_active, 1) = 1',
      'u.class_id IS NOT NULL',
    ];
    const studentParams: Array<number> = [];

    if (classId) {
      studentFilters.push('u.class_id = ?');
      studentParams.push(classId);
    }

    const activityFilters: string[] = [];
    const activityParams: Array<number | string> = [];

    if (orgLevelId) {
      activityFilters.push('a.organization_level_id = ?');
      activityParams.push(orgLevelId);
    }

    if (dateFrom) {
      activityFilters.push('date(a.date_time) >= date(?)');
      activityParams.push(dateFrom);
    }

    if (dateTo) {
      activityFilters.push('date(a.date_time) <= date(?)');
      activityParams.push(dateTo);
    }

    const studentWhereClause = studentFilters.join(' AND ');
    const activityWhereClause =
      activityFilters.length > 0 ? `WHERE ${activityFilters.join(' AND ')}` : '';

    const countResult = (await dbGet(
      `
      SELECT COUNT(DISTINCT u.id) as total
      FROM users u
      WHERE ${studentWhereClause}
    `,
      studentParams
    )) as { total?: number } | undefined;

    const total = countResult?.total || 0;

    const rankingQuery = `
      WITH student_base AS (
        SELECT
          u.id AS student_id,
          u.name AS student_name,
          u.email AS student_email,
          c.id AS class_id,
          c.name AS class_name
        FROM users u
        LEFT JOIN classes c ON u.class_id = c.id
        WHERE ${studentWhereClause}
      ),
      filtered_activities AS (
        SELECT
          a.id,
          a.organization_level_id,
          a.date_time
        FROM activities a
        ${activityWhereClause}
      ),
      activity_stats AS (
        SELECT
          p.student_id,
          COALESCE(
            SUM(
              CASE
                WHEN p.attendance_status = 'attended' THEN COALESCE(pc.total_points, 0)
                ELSE 0
              END
            ),
            0
          ) AS activity_points,
          COUNT(
            DISTINCT CASE
              WHEN p.attendance_status = 'attended' THEN p.id
            END
          ) AS activity_count
        FROM participations p
        INNER JOIN filtered_activities a ON p.activity_id = a.id
        LEFT JOIN point_calculations pc ON p.id = pc.participation_id
        GROUP BY p.student_id
      ),
      award_stats AS (
        SELECT
          u.id AS student_id,
          COALESCE((SELECT COUNT(*) FROM student_awards sa WHERE sa.student_id = u.id), 0) AS award_count
        FROM users u
        WHERE u.role = 'student'
      )
      SELECT
        sb.student_id,
        sb.student_name,
        sb.student_email,
        sb.class_id,
        sb.class_name,
        COALESCE(ast.activity_points, 0) AS activity_points,
        COALESCE(ast.activity_count, 0) AS activity_count,
        COALESCE(aw.award_count, 0) AS award_count
      FROM student_base sb
      LEFT JOIN activity_stats ast ON sb.student_id = ast.student_id
      LEFT JOIN award_stats aw ON sb.student_id = aw.student_id
      ORDER BY sb.student_name ASC
      LIMIT ? OFFSET ?
    `;

    const rankingRows = (await dbAll(rankingQuery, [
      ...studentParams,
      ...activityParams,
      limit,
      offset,
    ])) as Array<{
      student_id: number;
      student_name: string;
      student_email: string;
      class_id: number;
      class_name: string | null;
      activity_points: number;
      activity_count: number;
      award_count: number;
      award_points?: number;
      total_points?: number;
    }>;

    const ledgers = await getFinalScoreLedgerByStudentIds(
      rankingRows.map((row) => Number(row.student_id))
    );

    const rankedResults: RankingRecord[] = rankingRows
      .map((row) => {
        const activityCount = toNumber(row.activity_count);
        const ledger = ledgers.get(Number(row.student_id));
        const fallbackTotalPoints =
          toNumber(row.total_points) || toNumber(row.activity_points) + toNumber(row.award_points);
        const ledgerTotalPoints = toNumber(ledger?.final_total);
        const totalPoints =
          ledgerTotalPoints > 0 || fallbackTotalPoints === 0
            ? ledgerTotalPoints
            : fallbackTotalPoints;

        return {
          rank: 0,
          student_id: row.student_id,
          student_name: row.student_name,
          student_email: row.student_email,
          class_id: row.class_id,
          class_name: row.class_name || 'N/A',
          total_points: totalPoints,
          activity_count: activityCount,
          award_count: toNumber(row.award_count),
          avg_points:
            activityCount > 0
              ? Number((toNumber(row.activity_points) / activityCount).toFixed(2))
              : 0,
        };
      })
      .sort((left, right) => {
        if (sortBy === 'activity_count' && right.activity_count !== left.activity_count) {
          return right.activity_count - left.activity_count;
        }
        if (sortBy === 'award_count' && right.award_count !== left.award_count) {
          return right.award_count - left.award_count;
        }
        if (right.total_points !== left.total_points) {
          return right.total_points - left.total_points;
        }
        return String(left.student_name).localeCompare(String(right.student_name));
      })
      .map((row, index) => ({
        ...row,
        rank: offset + index + 1,
      }));

    return successResponse({
      rankings: rankedResults,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      filters: {
        class_id: classId,
        org_level_id: orgLevelId,
        date_from: dateFrom,
        date_to: dateTo,
        sort_by: sortBy,
      },
    });
  } catch (error: any) {
    console.error('Rankings error:', error);
    return errorResponse(
      error instanceof ApiError ||
        (error && typeof error.status === 'number' && typeof error.code === 'string')
        ? error
        : ApiError.internalError('Không thể tải bảng xếp hạng', { details: error?.message })
    );
  }
}
