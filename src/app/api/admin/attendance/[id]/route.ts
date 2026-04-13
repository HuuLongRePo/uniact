import { NextRequest } from 'next/server';
import { dbGet, dbRun } from '@/lib/database';
import { requireApiRole } from '@/lib/guards';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

const VALID_ATTENDANCE_STATUSES = ['present', 'absent', 'late'] as const;

type AttendanceStatus = (typeof VALID_ATTENDANCE_STATUSES)[number];

function toParticipationAttendanceStatus(status: AttendanceStatus): 'attended' | 'absent' {
  return status === 'absent' ? 'absent' : 'attended';
}

function toRecordStatus(status: AttendanceStatus): 'recorded' | 'void' {
  return status === 'absent' ? 'void' : 'recorded';
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiRole(request, ['admin']);

    const { id } = await context.params;
    const recordId = Number(id);
    if (!Number.isInteger(recordId) || recordId <= 0) {
      return errorResponse(ApiError.validation('Mã điểm danh không hợp lệ'));
    }

    const { status } = await request.json();

    if (!VALID_ATTENDANCE_STATUSES.includes(status)) {
      return errorResponse(ApiError.validation('Trạng thái điểm danh không hợp lệ'));
    }

    const attendanceRecord = (await dbGet(
      `SELECT id, activity_id, student_id
       FROM attendance_records
       WHERE id = ?`,
      [recordId]
    )) as { id: number; activity_id: number; student_id: number } | null;

    if (!attendanceRecord) {
      return errorResponse(ApiError.notFound('Không tìm thấy bản ghi điểm danh'));
    }

    const normalizedStatus = status as AttendanceStatus;

    await dbRun('UPDATE attendance_records SET status = ? WHERE id = ?', [
      toRecordStatus(normalizedStatus),
      recordId,
    ]);

    await dbRun(
      `UPDATE participations
       SET attendance_status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE activity_id = ? AND student_id = ?`,
      [
        toParticipationAttendanceStatus(normalizedStatus),
        attendanceRecord.activity_id,
        attendanceRecord.student_id,
      ]
    );

    try {
      await dbRun(
        `INSERT INTO audit_logs (actor_id, action, target_table, target_id, details)
         VALUES (?, 'UPDATE_ATTENDANCE', 'attendance_records', ?, ?)`,
        [
          user.id,
          recordId,
          JSON.stringify({
            activityId: attendanceRecord.activity_id,
            studentId: attendanceRecord.student_id,
            status: normalizedStatus,
          }),
        ]
      );
    } catch (auditError) {
      console.error('Failed to write audit log (attendance PUT):', auditError);
    }

    return successResponse(
      {
        updated: true,
        id: recordId,
        status: normalizedStatus,
        activityId: attendanceRecord.activity_id,
        studentId: attendanceRecord.student_id,
      },
      'Cập nhật điểm danh thành công'
    );
  } catch (error: any) {
    console.error('Update attendance error:', error);
    return errorResponse(
      error instanceof ApiError ||
        (error && typeof error.status === 'number' && typeof error.code === 'string')
        ? error
        : ApiError.internalError('Không thể cập nhật điểm danh', { details: error?.message })
    );
  }
}
