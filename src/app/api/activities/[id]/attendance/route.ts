import { NextRequest } from 'next/server';
import { dbAll, dbGet, dbRun, withTransaction } from '@/lib/database';
import { requireRole } from '@/lib/guards';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

function mapStatus(attendanceStatus: string | null | undefined): 'present' | 'absent' {
  return attendanceStatus === 'attended' ? 'present' : 'absent';
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    let user;
    try {
      user = await requireRole(request, ['teacher', 'admin']);
    } catch (err: any) {
      const msg = String(err?.message || '');
      return errorResponse(
        msg.includes('Chưa đăng nhập')
          ? ApiError.unauthorized('Chưa đăng nhập')
          : ApiError.forbidden('Không có quyền truy cập')
      );
    }

    const { id } = await params;
    const activityId = Number(id);
    if (!Number.isFinite(activityId)) {
      return errorResponse(ApiError.validation('ID hoạt động không hợp lệ'));
    }

    const activity = (await dbGet('SELECT id, teacher_id FROM activities WHERE id = ?', [
      activityId,
    ])) as any;
    if (!activity) return errorResponse(ApiError.notFound('Không tìm thấy hoạt động'));

    if (user.role === 'teacher' && activity.teacher_id !== user.id) {
      return errorResponse(ApiError.forbidden('Bạn chỉ có thể xem hoạt động của mình'));
    }

    // Return records for students that have been marked (attended/absent) via participations
    const rows = (await dbAll(
      `SELECT 
        COALESCE(ar.id, 0) as id,
        p.student_id,
        p.activity_id,
        p.attendance_status,
        p.achievement_level,
        COALESCE(u.full_name, u.name) as student_name,
        u.email as student_email,
        COALESCE(u.student_code, u.code, u.username, u.student_id) as student_code,
        COALESCE(c.name, '') as class_name,
        COALESCE(ar.recorded_at, p.updated_at, p.created_at) as check_in_time,
        COALESCE(ar.note, NULL) as notes,
        COALESCE(u2.name, u2.full_name, '') as marked_by
      FROM participations p
      JOIN users u ON u.id = p.student_id
      LEFT JOIN classes c ON c.id = u.class_id
      LEFT JOIN attendance_records ar
        ON ar.id = (
          SELECT ar2.id
          FROM attendance_records ar2
          WHERE ar2.activity_id = p.activity_id
            AND ar2.student_id = p.student_id
          ORDER BY ar2.recorded_at DESC, ar2.id DESC
          LIMIT 1
        )
      LEFT JOIN users u2 ON u2.id = ar.recorded_by
      WHERE p.activity_id = ?
        AND p.attendance_status IN ('attended','absent')
      ORDER BY COALESCE(u.full_name, u.name)`,
      [activityId]
    )) as any[];

    const records = (rows || []).map((r) => ({
      id: r.id,
      student_id: r.student_id,
      student_name: r.student_name,
      student_email: r.student_email,
      student_code: r.student_code,
      class_name: r.class_name,
      activity_id: r.activity_id,
      status: mapStatus(r.attendance_status),
      achievement_level: r.achievement_level ?? null,
      check_in_time: r.check_in_time,
      marked_at: r.check_in_time,
      notes: r.notes ?? null,
      marked_by: r.marked_by,
    }));

    return successResponse({ records });
  } catch (error: any) {
    console.error('Get activity attendance error:', error);
    return errorResponse(ApiError.internalError('Không thể tải dữ liệu điểm danh', error?.message));
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    let user;
    try {
      user = await requireRole(request, ['teacher', 'admin']);
    } catch (err: any) {
      const msg = String(err?.message || '');
      return errorResponse(
        msg.includes('Chưa đăng nhập')
          ? ApiError.unauthorized('Chưa đăng nhập')
          : ApiError.forbidden('Không có quyền truy cập')
      );
    }

    const { id } = await params;
    const activityId = Number(id);
    if (!Number.isFinite(activityId)) {
      return errorResponse(ApiError.validation('ID hoạt động không hợp lệ'));
    }

    const activity = (await dbGet('SELECT id, teacher_id, title FROM activities WHERE id = ?', [
      activityId,
    ])) as any;
    if (!activity) return errorResponse(ApiError.notFound('Không tìm thấy hoạt động'));

    if (user.role === 'teacher' && activity.teacher_id !== user.id) {
      return errorResponse(ApiError.forbidden('Bạn chỉ có thể điểm danh cho hoạt động của mình'));
    }

    const body = await request.json().catch(() => ({}));
    const records = Array.isArray(body?.records) ? body.records : [];
    if (records.length === 0) {
      return errorResponse(ApiError.validation('records (mảng) không hợp lệ'));
    }

    let updated = 0;

    await withTransaction(async () => {
      for (const r of records) {
        const studentId = Number(r?.student_id);
        if (!Number.isFinite(studentId)) continue;

        const status = String(r?.status || 'absent');
        const achievementLevel = r?.achievement_level ?? null;

        // Ensure participation exists
        const existing = (await dbGet(
          'SELECT id, attendance_status FROM participations WHERE activity_id = ? AND student_id = ?',
          [activityId, studentId]
        )) as any;

        if (!existing) {
          await dbRun(
            `INSERT OR IGNORE INTO participations (activity_id, student_id, attendance_status, achievement_level)
             VALUES (?, ?, ?, ?)`,
            [
              activityId,
              studentId,
              status === 'present' ? 'attended' : 'absent',
              status === 'present' ? achievementLevel : null,
            ]
          );
        } else {
          await dbRun(
            `UPDATE participations
             SET attendance_status = ?, achievement_level = ?, updated_at = datetime('now')
             WHERE activity_id = ? AND student_id = ?`,
            [
              status === 'present' ? 'attended' : 'absent',
              status === 'present' ? achievementLevel : null,
              activityId,
              studentId,
            ]
          );
        }

        // Attendance record: keep one record per activity/student; mark void if absent
        const ar = (await dbGet(
          `SELECT id, status FROM attendance_records
           WHERE activity_id = ? AND student_id = ?
           ORDER BY recorded_at DESC
           LIMIT 1`,
          [activityId, studentId]
        )) as any;

        if (status === 'present') {
          if (!ar) {
            await dbRun(
              `INSERT INTO attendance_records (qr_session_id, activity_id, student_id, recorded_by, method, note, status)
               VALUES (NULL, ?, ?, ?, 'manual', NULL, 'recorded')`,
              [activityId, studentId, user.id]
            );
          } else if (ar.status !== 'recorded') {
            await dbRun(
              `UPDATE attendance_records SET status = 'recorded', method = 'manual', recorded_by = ?, recorded_at = datetime('now')
               WHERE id = ?`,
              [user.id, ar.id]
            );
          }
        } else {
          if (ar && ar.status === 'recorded') {
            await dbRun(
              `UPDATE attendance_records SET status = 'void', method = 'manual', recorded_by = ?, recorded_at = datetime('now')
               WHERE id = ?`,
              [user.id, ar.id]
            );
          }
        }

        updated++;
      }
    });

    return successResponse({ updated }, 'Lưu dấu danh thành công');
  } catch (error: any) {
    console.error('Save activity attendance error:', error);
    return errorResponse(ApiError.internalError('Không thể lưu dấu danh', error?.message));
  }
}
