import { NextRequest, NextResponse } from 'next/server';
import { dbAll, dbGet, dbReady } from '@/lib/database';
import { requireRole } from '@/lib/guards';
import { ApiError, errorResponse } from '@/lib/api-response';
import { createSimplePdf } from '@/lib/reports/simple-pdf';
import { calculateAttendanceRate } from '@/lib/calculations';
import { formatDate } from '@/lib/formatters';

async function assertCanAccessClass(
  user: { id: number; role: string },
  classId: number
): Promise<void> {
  if (user.role === 'admin') return;

  const row = await dbGet(
    `
    SELECT c.id
    FROM classes c
    LEFT JOIN class_teachers ct ON ct.class_id = c.id AND ct.teacher_id = ?
    WHERE c.id = ? AND (c.teacher_id = ? OR ct.teacher_id IS NOT NULL)
    `,
    [user.id, classId, user.id]
  );

  if (!row) throw ApiError.forbidden('Bạn không có quyền xem lớp này');
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

    const body = await request.json().catch(() => ({}));
    const classId = body?.class_id ? Number(body.class_id) : null;

    const lines: string[] = [];
    lines.push('Thống kê lớp học (12 tháng gần nhất)');
    lines.push(`Xuất lúc: ${formatDate(new Date(), 'datetime')}`);
    lines.push('');

    if (classId && !Number.isNaN(classId)) {
      await assertCanAccessClass(user, classId);
      const cls = (await dbGet(`SELECT name FROM classes WHERE id = ?`, [classId])) as any;
      lines.push(`Lớp: ${String(cls?.name || classId)}`);
      lines.push('');

      const totalStudentsRow = (await dbGet(
        `SELECT COUNT(*) as total FROM users WHERE role='student' AND class_id = ?`,
        [classId]
      )) as any;
      const totalStudents = Number(totalStudentsRow?.total || 0);

      const totalActivitiesRow = (await dbGet(
        `
        SELECT COUNT(DISTINCT a.id) as total
        FROM activity_classes ac
        JOIN activities a ON a.id = ac.activity_id
        WHERE ac.class_id = ? AND date(a.date_time) >= date('now', '-365 day')
        `,
        [classId]
      )) as any;
      const totalActivities = Number(totalActivitiesRow?.total || 0);

      const attendedRow = (await dbGet(
        `
        SELECT COUNT(*) as attended
        FROM participations p
        JOIN users u ON u.id = p.student_id
        JOIN activity_classes ac ON ac.activity_id = p.activity_id AND ac.class_id = u.class_id
        JOIN activities a ON a.id = p.activity_id
        WHERE u.role='student' AND u.class_id = ?
          AND p.attendance_status = 'attended'
          AND date(a.date_time) >= date('now', '-365 day')
        `,
        [classId]
      )) as any;

      const attended = Number(attendedRow?.attended || 0);
      const denom = totalStudents * totalActivities;
      const rate = calculateAttendanceRate(attended, denom).toFixed(1);

      lines.push(`Tổng học viên: ${totalStudents}`);
      lines.push(`Tổng hoạt động: ${totalActivities}`);
      lines.push(`Tỉ lệ điểm danh (attended): ${rate}%`);
    } else {
      const rows = await dbAll(
        `
        SELECT c.name as class_name,
               (SELECT COUNT(*) FROM users u WHERE u.role='student' AND u.class_id=c.id) as total_students
        FROM classes c
        ORDER BY c.grade ASC, c.name ASC
        LIMIT 50
        `
      );

      lines.push('Danh sách lớp (tối đa 50):');
      for (const r of rows as any[]) {
        lines.push(`${String(r.class_name || '')} - ${Number(r.total_students || 0)} học viên`);
      }
    }

    const pdf = createSimplePdf(lines);

    return new NextResponse(pdf as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="class-stats-${Date.now()}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    console.error('Class stats export error:', error);
    return errorResponse(
      error instanceof ApiError
        ? error
        : ApiError.internalError('Không thể xuất báo cáo', { details: error?.message })
    );
  }
}
