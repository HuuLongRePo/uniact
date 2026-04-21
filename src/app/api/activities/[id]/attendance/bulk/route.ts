import { NextRequest } from 'next/server';
import { dbGet, dbRun, ensureParticipationColumns, withTransaction } from '@/lib/database';
import { requireRole } from '@/lib/guards';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import { teacherCanAccessActivity } from '@/lib/activity-access';

function normalizeToParticipationStatus(status: unknown): 'attended' | 'absent' {
  const s = String(status || '').toLowerCase();
  if (s === 'present' || s === 'attended' || s === 'late' || s === 'excused') return 'attended';
  return 'absent';
}

/**
 * POST /api/activities/[id]/attendance/bulk
 * Compat endpoint for teacher bulk attendance UI.
 * Accepts: { attendance: [{ student_id, status, notes?, check_in_time? }] }
 */
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

    const activity = (await dbGet('SELECT id, teacher_id FROM activities WHERE id = ?', [
      activityId,
    ])) as any;
    if (!activity) return errorResponse(ApiError.notFound('Không tìm thấy hoạt động'));

    await ensureParticipationColumns();

    if (
      user.role === 'teacher' &&
      !(await teacherCanAccessActivity(Number(user.id), Number(activityId)))
    ) {
      return errorResponse(
        ApiError.forbidden('Bạn chỉ có thể điểm danh cho hoạt động thuộc phạm vi quản lý')
      );
    }

    const body = await request.json().catch(() => ({}));
    const attendance = Array.isArray(body?.attendance) ? body.attendance : [];
    if (attendance.length === 0) {
      return errorResponse(ApiError.validation('attendance (mảng) không hợp lệ'));
    }

    let savedCount = 0;

    await withTransaction(async () => {
      for (const item of attendance) {
        const studentId = Number(item?.student_id);
        if (!Number.isFinite(studentId)) continue;

        const participationStatus = normalizeToParticipationStatus(item?.status);
        const note = item?.notes ?? null;
        const checkInTime = item?.check_in_time;
        const recordedAtIso = typeof checkInTime === 'string' && checkInTime ? checkInTime : null;

        // Ensure participation exists
        const existing = (await dbGet(
          'SELECT id FROM participations WHERE activity_id = ? AND student_id = ?',
          [activityId, studentId]
        )) as any;

        if (!existing) {
          await dbRun(
            `INSERT OR IGNORE INTO participations (
               activity_id,
               student_id,
               attendance_status,
               participation_source,
               achievement_level
             )
             VALUES (?, ?, ?, 'assigned', NULL)`,
            [activityId, studentId, participationStatus]
          );
        } else {
          await dbRun(
            `UPDATE participations
             SET attendance_status = ?,
                 updated_at = datetime('now')
             WHERE activity_id = ? AND student_id = ?`,
            [participationStatus, activityId, studentId]
          );
        }

        // Upsert latest attendance record row
        const ar = (await dbGet(
          `SELECT id, status FROM attendance_records
           WHERE activity_id = ? AND student_id = ?
           ORDER BY recorded_at DESC, id DESC
           LIMIT 1`,
          [activityId, studentId]
        )) as any;

        const targetStatus = participationStatus === 'attended' ? 'recorded' : 'void';

        if (!ar) {
          if (recordedAtIso) {
            await dbRun(
              `INSERT INTO attendance_records (qr_session_id, activity_id, student_id, recorded_by, method, note, status, recorded_at)
               VALUES (NULL, ?, ?, ?, 'bulk', ?, ?, ?)`,
              [activityId, studentId, user.id, note, targetStatus, recordedAtIso]
            );
          } else {
            await dbRun(
              `INSERT INTO attendance_records (qr_session_id, activity_id, student_id, recorded_by, method, note, status)
               VALUES (NULL, ?, ?, ?, 'bulk', ?, ?)`,
              [activityId, studentId, user.id, note, targetStatus]
            );
          }
        } else {
          if (recordedAtIso) {
            await dbRun(
              `UPDATE attendance_records
               SET status = ?, method = 'bulk', recorded_by = ?, note = ?, recorded_at = ?
               WHERE id = ?`,
              [targetStatus, user.id, note, recordedAtIso, ar.id]
            );
          } else {
            await dbRun(
              `UPDATE attendance_records
               SET status = ?, method = 'bulk', recorded_by = ?, note = ?, recorded_at = datetime('now')
               WHERE id = ?`,
              [targetStatus, user.id, note, ar.id]
            );
          }
        }

        savedCount++;
      }
    });

    return successResponse({ saved_count: savedCount }, 'Lưu điểm danh thành công');
  } catch (error: any) {
    console.error('Bulk attendance error:', error);
    return errorResponse(ApiError.internalError('Không thể lưu điểm danh', error?.message));
  }
}
