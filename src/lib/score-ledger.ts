import { dbAll } from '@/lib/database';

export type FinalScoreLedgerRow = {
  student_id: number;
  participation_points: number;
  award_points: number;
  adjustment_points: number;
  final_total: number;
};

export function toScoreNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function getFinalScoreLedgerByStudentIds(
  studentIds: number[]
): Promise<Map<number, FinalScoreLedgerRow>> {
  const normalizedIds = Array.from(new Set(studentIds.map((id) => Number(id)).filter(Boolean)));

  if (normalizedIds.length === 0) {
    return new Map();
  }

  const placeholders = normalizedIds.map(() => '?').join(',');

  const rows = (await dbAll(
    `
    WITH participation_totals AS (
      SELECT
        p.student_id,
        COALESCE(SUM(CASE WHEN p.attendance_status = 'attended' THEN pc.total_points ELSE 0 END), 0) AS participation_points
      FROM participations p
      LEFT JOIN point_calculations pc ON pc.participation_id = p.id
      WHERE p.student_id IN (${placeholders})
      GROUP BY p.student_id
    ),
    award_totals AS (
      SELECT
        ss.student_id,
        COALESCE(SUM(ss.points), 0) AS award_points
      FROM student_scores ss
      WHERE ss.student_id IN (${placeholders})
        AND ss.source LIKE 'award:%'
      GROUP BY ss.student_id
    ),
    adjustment_totals AS (
      SELECT
        ss.student_id,
        COALESCE(SUM(ss.points), 0) AS adjustment_points
      FROM student_scores ss
      WHERE ss.student_id IN (${placeholders})
        AND ss.source LIKE 'adjustment:%'
      GROUP BY ss.student_id
    )
    SELECT
      ids.student_id,
      COALESCE(pt.participation_points, 0) AS participation_points,
      COALESCE(aw.award_points, 0) AS award_points,
      COALESCE(adj.adjustment_points, 0) AS adjustment_points,
      COALESCE(pt.participation_points, 0) + COALESCE(aw.award_points, 0) + COALESCE(adj.adjustment_points, 0) AS final_total
    FROM (
      SELECT ? AS student_id
      ${normalizedIds
        .slice(1)
        .map(() => 'UNION ALL SELECT ?')
        .join('\n      ')}
    ) ids
    LEFT JOIN participation_totals pt ON pt.student_id = ids.student_id
    LEFT JOIN award_totals aw ON aw.student_id = ids.student_id
    LEFT JOIN adjustment_totals adj ON adj.student_id = ids.student_id
    `,
    [...normalizedIds, ...normalizedIds, ...normalizedIds, ...normalizedIds]
  )) as Array<Record<string, unknown>>;

  return new Map(
    rows.map((row) => {
      const studentId = toScoreNumber(row.student_id);
      return [
        studentId,
        {
          student_id: studentId,
          participation_points: toScoreNumber(row.participation_points),
          award_points: toScoreNumber(row.award_points),
          adjustment_points: toScoreNumber(row.adjustment_points),
          final_total: toScoreNumber(row.final_total),
        },
      ];
    })
  );
}
