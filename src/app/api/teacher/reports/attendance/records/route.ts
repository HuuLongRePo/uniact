import { NextRequest } from 'next/server';
import { dbAll, dbReady } from '@/lib/database';
import { requireRole } from '@/lib/guards';
import { ApiError, successResponse, errorResponse } from '@/lib/api-response';
import { formatAttendanceStatus } from '@/lib/formatters';

type AttendanceReportStatus = 'present' | 'absent' | 'late' | 'excused' | 'not_participated';
type AttendanceMethod = 'manual' | 'qr' | 'face' | 'unknown';

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

export async function GET(request: NextRequest) {
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
      return successResponse({ records: [] });
    }

    const inClause = classIds.map(() => '?').join(',');

    const rows = await dbAll(
      `
      SELECT
        u.id as student_id,
        u.name as student_name,
        u.student_code as student_code,
        c.name as class_name,
        a.title as activity_name,
        date(a.date_time) as activity_date,
        p.attendance_status as attendance_status,
        (
          SELECT MAX(ar.recorded_at)
          FROM attendance_records ar
          WHERE ar.activity_id = a.id AND ar.student_id = u.id
        ) as check_in_time,
        (
          SELECT ar2.note
          FROM attendance_records ar2
          WHERE ar2.activity_id = a.id AND ar2.student_id = u.id
          ORDER BY ar2.recorded_at DESC
          LIMIT 1
        ) as notes,
        (
          SELECT ar3.method
          FROM attendance_records ar3
          WHERE ar3.activity_id = a.id AND ar3.student_id = u.id
          ORDER BY ar3.recorded_at DESC
          LIMIT 1
        ) as attendance_method
      FROM participations p
      JOIN users u ON u.id = p.student_id
      JOIN classes c ON c.id = u.class_id
      JOIN activities a ON a.id = p.activity_id
      WHERE u.role = 'student'
        AND u.class_id IN (${inClause})
        AND date(a.date_time) >= date('now', '-365 day')
      ORDER BY a.date_time DESC, u.name ASC
      `,
      classIds
    );

    const records = (rows as any[]).map((r) => {
      const normalizedMethod = String(r.attendance_method || '').toLowerCase();
      const method: AttendanceMethod =
        normalizedMethod === 'manual' || normalizedMethod === 'qr' || normalizedMethod === 'face'
          ? (normalizedMethod as AttendanceMethod)
          : 'unknown';

      return {
        student_id: Number(r.student_id),
        student_name: String(r.student_name || ''),
        student_code: String(r.student_code || ''),
        class_name: String(r.class_name || ''),
        activity_name: String(r.activity_name || ''),
        activity_date: String(r.activity_date || ''),
        status: formatAttendanceStatus(
          r.attendance_status as 'attended' | 'absent' | 'registered' | null
        ) as AttendanceReportStatus,
        method,
        check_in_time: r.check_in_time ? String(r.check_in_time) : undefined,
        notes: r.notes ? String(r.notes) : undefined,
      };
    });

    return successResponse({ records });
  } catch (error: any) {
    console.error('Teacher attendance records report error:', error);
    return errorResponse(
      error instanceof ApiError
        ? error
        : ApiError.internalError('Không thể tải báo cáo', { details: error?.message })
    );
  }
}
