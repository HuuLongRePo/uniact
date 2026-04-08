import { NextRequest, NextResponse } from 'next/server';
import { dbAll, dbReady } from '@/lib/database';
import { requireRole } from '@/lib/guards';
import { ApiError, errorResponse } from '@/lib/api-response';
import { createSimplePdf } from '@/lib/reports/simple-pdf';
import { calculateParticipationRate } from '@/lib/calculations';
import { formatDate } from '@/lib/formatters';

async function getAccessibleClassIds(user: { id: number; role: string }): Promise<number[]> {
  if (user.role === 'admin') {
    const rows = await dbAll(`SELECT id FROM classes ORDER BY id`);
    return (rows as any[]).map((r) => Number(r.id)).filter(Boolean);
  }

  const rows = await dbAll(
    `
    SELECT DISTINCT c.id
    FROM classes c
    LEFT JOIN class_teachers ct ON ct.class_id = c.id
    WHERE c.teacher_id = ? OR ct.teacher_id = ?
    `,
    [user.id, user.id]
  );

  return (rows as any[]).map((r) => Number(r.id)).filter(Boolean);
}

export async function POST(request: NextRequest) {
  try {
    await dbReady();

    let user;
    try {
      user = await requireRole(request, ['teacher', 'admin']);
    } catch {
      return errorResponse(ApiError.unauthorized('Chưa đăng nhập'));
    }

    const classIds = await getAccessibleClassIds(user);
    if (classIds.length === 0) {
      const pdf = createSimplePdf(['Bao cao tham gia hoat dong', 'Khong co du lieu']);
      return new NextResponse(pdf as any, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="participation-report.pdf"`,
        },
      });
    }

    const inClause = classIds.map(() => '?').join(',');

    // Minimal summary table for export
    const rows = await dbAll(
      `
      WITH score_by_activity AS (
        SELECT student_id, activity_id, SUM(points) as points
        FROM student_scores
        GROUP BY student_id, activity_id
      )
      SELECT
        u.id as student_id,
        u.name as student_name,
        u.student_code as student_code,
        c.name as class_name,
        COUNT(a.id) as total_activities,
        SUM(CASE WHEN p.id IS NULL THEN 0 ELSE 1 END) as participated_count,
        SUM(COALESCE(sba.points, 0)) as total_score
      FROM users u
      JOIN classes c ON c.id = u.class_id
      JOIN activity_classes ac ON ac.class_id = c.id
      JOIN activities a ON a.id = ac.activity_id
      LEFT JOIN participations p ON p.activity_id = a.id AND p.student_id = u.id
      LEFT JOIN score_by_activity sba ON sba.activity_id = a.id AND sba.student_id = u.id
      WHERE u.role = 'student'
        AND u.class_id IN (${inClause})
        AND date(a.date_time) >= date('now', '-365 day')
      GROUP BY u.id, u.name, u.student_code, c.name
      ORDER BY c.name ASC, u.name ASC
      `,
      classIds
    );

    const lines: string[] = [];
    lines.push('Bao cao tham gia hoat dong (12 thang gan nhat)');
    lines.push(`Xuat luc: ${formatDate(new Date(), 'datetime')}`);
    lines.push('');
    lines.push('Student | Code | Class | Total | Joined | Rate% | Score');

    for (const r of rows as any[]) {
      const total = Number(r.total_activities || 0);
      const joined = Number(r.participated_count || 0);
      const rate = calculateParticipationRate(joined, total).toFixed(1);
      const score = Number(r.total_score || 0).toFixed(1);
      lines.push(
        `${String(r.student_name || '')} | ${String(r.student_code || '')} | ${String(r.class_name || '')} | ${total} | ${joined} | ${rate} | ${score}`
      );
      if (lines.length > 120) {
        lines.push('... (cat bot dong de tranh file qua lon)');
        break;
      }
    }

    const pdf = createSimplePdf(lines);

    return new NextResponse(pdf as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="participation-report-${Date.now()}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    console.error('Participation report export error:', error);
    return errorResponse(
      error instanceof ApiError
        ? error
        : ApiError.internalError('Không thể xuất báo cáo', { details: error?.message })
    );
  }
}
