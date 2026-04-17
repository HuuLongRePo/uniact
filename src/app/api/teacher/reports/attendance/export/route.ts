import { NextRequest, NextResponse } from 'next/server';
import { dbAll, dbGet, dbReady } from '@/lib/database';
import { createWorkbookFromJsonSheets, createWorkbookFromSheets } from '@/lib/excel-export';
import { requireRole } from '@/lib/guards';
import { ApiError, errorResponse } from '@/lib/api-response';
import { calculateAttendanceRate } from '@/lib/calculations';
import { formatAttendanceStatus } from '@/lib/formatters';

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
      const buf = await createWorkbookFromSheets([
        { name: 'Report', rows: [['Khong co du lieu']] },
      ]);
      return new NextResponse(buf as any, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="attendance-report-${Date.now()}.xlsx"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    const inClause = classIds.map(() => '?').join(',');

    const recordRows = await dbAll(
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

    const records = (recordRows as any[]).map((r) => {
      const normalizedMethod = String(r.attendance_method || '').toLowerCase();
      const method =
        normalizedMethod === 'manual' || normalizedMethod === 'qr' || normalizedMethod === 'face'
          ? normalizedMethod
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
        ),
        method,
        check_in_time: r.check_in_time ? String(r.check_in_time) : '',
        notes: r.notes ? String(r.notes) : '',
      };
    });

    const classSummary: any[] = [];
    for (const classId of classIds) {
      const cls = (await dbGet(`SELECT id, name FROM classes WHERE id = ?`, [classId])) as any;
      if (!cls) continue;

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

      const counts = (await dbGet(
        `
        SELECT
          SUM(CASE WHEN p.attendance_status = 'attended' THEN 1 ELSE 0 END) as present_count,
          SUM(CASE WHEN p.attendance_status = 'absent' THEN 1 ELSE 0 END) as absent_count,
          SUM(CASE WHEN p.attendance_status = 'registered' THEN 1 ELSE 0 END) as not_participated_count
        FROM participations p
        JOIN users u ON u.id = p.student_id
        JOIN activities a ON a.id = p.activity_id
        JOIN activity_classes ac ON ac.activity_id = p.activity_id AND ac.class_id = u.class_id
        WHERE u.role='student' AND u.class_id = ?
          AND date(a.date_time) >= date('now', '-365 day')
        `,
        [classId]
      )) as any;

      const present = Number(counts?.present_count || 0);
      const absent = Number(counts?.absent_count || 0);
      const notParticipated = Number(counts?.not_participated_count || 0);
      const late = 0;

      const denom = totalStudents * totalActivities;
      const presentRate = calculateAttendanceRate(present, denom);
      const absentRate = calculateAttendanceRate(absent, denom);

      classSummary.push({
        class_id: Number(cls.id),
        class_name: String(cls.name || ''),
        total_students: totalStudents,
        total_activities: totalActivities,
        present_count: present,
        absent_count: absent,
        late_count: late,
        not_participated_count: notParticipated,
        present_rate: presentRate,
        absent_rate: absentRate,
        late_rate: 0,
      });
    }

    const totalActivitiesByClass = new Map<number, number>();
    const activityCounts = await dbAll(
      `
      SELECT ac.class_id, COUNT(DISTINCT a.id) as total
      FROM activity_classes ac
      JOIN activities a ON a.id = ac.activity_id
      WHERE ac.class_id IN (${inClause})
        AND date(a.date_time) >= date('now', '-365 day')
      GROUP BY ac.class_id
      `,
      classIds
    );
    for (const r of activityCounts as any[]) {
      totalActivitiesByClass.set(Number(r.class_id), Number(r.total || 0));
    }

    const studentRows = await dbAll(
      `
      SELECT
        u.id as student_id,
        u.name as student_name,
        u.student_code as student_code,
        c.name as class_name,
        u.class_id as class_id,
        SUM(CASE WHEN p.attendance_status = 'attended' THEN 1 ELSE 0 END) as present_count,
        SUM(CASE WHEN p.attendance_status = 'absent' THEN 1 ELSE 0 END) as absent_count,
        SUM(CASE WHEN p.attendance_status = 'registered' THEN 1 ELSE 0 END) as not_participated_count
      FROM users u
      JOIN classes c ON c.id = u.class_id
      LEFT JOIN participations p ON p.student_id = u.id
      LEFT JOIN activities a ON a.id = p.activity_id
      WHERE u.role='student' AND u.class_id IN (${inClause})
        AND (a.id IS NULL OR date(a.date_time) >= date('now', '-365 day'))
      GROUP BY u.id, u.name, u.student_code, c.name, u.class_id
      ORDER BY c.name ASC, u.name ASC
      `,
      classIds
    );

    const studentSummary = (studentRows as any[]).map((r) => {
      const classId = Number(r.class_id);
      const totalActivities = totalActivitiesByClass.get(classId) || 0;
      const present = Number(r.present_count || 0);
      const absent = Number(r.absent_count || 0);
      const notParticipated = Number(r.not_participated_count || 0);
      const attendanceRate = calculateAttendanceRate(present, totalActivities);

      return {
        student_id: Number(r.student_id),
        student_name: String(r.student_name || ''),
        student_code: String(r.student_code || ''),
        class_name: String(r.class_name || ''),
        total_activities: totalActivities,
        present_count: present,
        absent_count: absent,
        late_count: 0,
        not_participated_count: notParticipated,
        attendance_rate: attendanceRate,
      };
    });

    const buf = await createWorkbookFromJsonSheets([
      { name: 'Records', rows: records },
      { name: 'Class Summary', rows: classSummary },
      { name: 'Student Summary', rows: studentSummary },
    ]);

    return new NextResponse(buf as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="attendance-report-${Date.now()}.xlsx"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    console.error('Attendance export error:', error);
    return errorResponse(
      error instanceof ApiError
        ? error
        : ApiError.internalError('Không thể xuất báo cáo', { details: error?.message })
    );
  }
}
