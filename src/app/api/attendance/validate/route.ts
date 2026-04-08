import { NextRequest } from 'next/server';
import { dbHelpers, dbRun, withTransaction } from '@/lib/database';
import { requireApiRole } from '@/lib/guards';
import { User } from '@/types/database';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

/**
 * POST /api/attendance/validate
 * 
 * Core attendance validation endpoint for QR-based check-in.
 * Validates student identity, session status, activity state, token TTL,
 * and prevents duplicate attendance records with atomic transaction safety.
 * 
 * @request Body: { qr_token: string, session_id?: number }
 * @response 200 OK | 400 Bad Request | 403 Forbidden | 500 Internal Server Error
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { qr_token, session_id } = body;

    // ============================================
    // 1. INPUT VALIDATION
    // ============================================
    if (!qr_token) {
      return errorResponse(ApiError.validation('Vui lòng cung cấp qr_token'));
    }

    const sessionId = Number(session_id);
    if (!Number.isFinite(sessionId)) {
      return errorResponse(ApiError.validation('session_id không hợp lệ'));
    }

    // ============================================
    // 2. AUTHENTICATION: Only students can self-checkin
    // ============================================
    const user = await requireApiRole(request, ['student']);
    const student = user as User;


    // ============================================
    // 3. FETCH & VALIDATE QR SESSION
    // ============================================
    const session = await dbHelpers.getQRSessionByToken(qr_token, sessionId);

    if (!session) {
      // Generic error to prevent token enumeration attacks
      return errorResponse(ApiError.validation('Mã QR không hợp lệ hoặc đã hết hạn'));
    }

    // Check session is active
    if (!session.is_active) {
      return errorResponse(ApiError.validation('Phiên QR đã bị vô hiệu hoá'));
    }

    // ============================================
    // 4. VALIDATE TOKEN TTL (Time-To-Live)
    // ============================================
    const now = new Date();
    const expiresAt = new Date(session.expires_at);

    if (expiresAt <= now) {
      // Audit: token expired
      try {
        await dbHelpers.createAuditLog(
          student.id,
          'attendance_failed_token_expired',
          'qr_sessions',
          session.id,
          JSON.stringify({
            actor_id: student.id,
            actor_role: student.role,
            target_table: 'qr_sessions',
            target_id: session.id,
            result: 'failed',
            reason: 'token_expired',
            expires_at: session.expires_at,
            current_time: now.toISOString(),
          })
        );
      } catch (auditErr) {
        console.warn('Failed to log expired token attempt:', auditErr);
      }

      return errorResponse(ApiError.validation('Mã QR đã hết hạn'));
    }

    // ============================================
    // 5. VALIDATE ACTIVITY STATUS
    // ============================================
    const activity = (await dbHelpers.getActivityById(session.activity_id)) as
      | {
          id: number;
          teacher_id: number;
          status: string;
          approval_status: string;
        }
      | undefined;

    if (!activity) {
      return errorResponse(
        ApiError.notFound('Hoạt động liên quan không tồn tại hoặc đã bị xóa')
      );
    }

    // Activity must be approved AND published to allow check-ins
    if (activity.approval_status !== 'approved') {
      return errorResponse(
        ApiError.validation('Hoạt động chưa được phê duyệt. Không thể điểm danh.')
      );
    }

    if (activity.status !== 'published' && activity.status !== 'completed') {
      return errorResponse(
        ApiError.validation('Hoạt động chưa được công bố hoặc đã bị hủy. Không thể điểm danh.')
      );
    }

    // ============================================
    // 6. PARSE SESSION METADATA (max_scans, single_use)
    // ============================================
    let metadata: { single_use?: boolean; max_scans?: number | null } = {};
    try {
      if (session.metadata) {
        metadata = JSON.parse(session.metadata);
      }
    } catch (parseErr) {
      console.warn('Failed to parse session metadata:', parseErr);
      metadata = {};
    }

    // ============================================
    // 7. ATOMIC TRANSACTION FOR ATTENDANCE RECORDING
    // ============================================
    let attendanceResult: any;
    let alreadyRecorded = false;
    let participationUpdateChanges = 0;

    try {
      ({ attendanceResult, alreadyRecorded, participationUpdateChanges } = await withTransaction(
        async () => {
          // 7a. RE-CHECK MAX_SCANS INSIDE TRANSACTION (race condition prevention)
          if (typeof metadata.max_scans === 'number' && metadata.max_scans > 0) {
            const scanCount = await dbHelpers.countAttendanceForSession(session.id);
            if (scanCount >= metadata.max_scans) {
              throw new Error('QUOTA_EXCEEDED');
            }
          }

          // 7b. ANTI-DUPLICATE CHECK: Student already attended this activity?
          const existingRecord = await dbHelpers.checkExistingAttendance(
            student.id,
            session.activity_id
          );

          if (existingRecord) {
            // Idempotent response: mark as already recorded
            return {
              attendanceResult: existingRecord,
              alreadyRecorded: true,
              participationUpdateChanges: 0,
            };
          }

          // 7c. CREATE ATTENDANCE RECORD
          const result = await dbHelpers.createAttendanceRecord(
            session.id,
            session.activity_id,
            student.id,
            student.id, // recorded_by: student self-recorded via QR
            'qr'
          );

          // 7d. UPDATE PARTICIPATION STATUS IF EXISTS
          const updateResult = await dbHelpers.updateParticipationStatus(
            student.id,
            session.activity_id,
            'attended'
          );

          // 7e. HANDLE SINGLE_USE OPTION: Deactivate session after first scan
          if (metadata.single_use) {
            await dbHelpers.deactivateQRSession(session.id);
          }

          return {
            attendanceResult: result,
            alreadyRecorded: false,
            participationUpdateChanges: updateResult.changes ?? 0,
          };
        }
      ));
    } catch (err: any) {
      const errMsg = String(err?.message || '');

      // Handle specific error types
      if (errMsg === 'QUOTA_EXCEEDED') {
        // Audit: quota exceeded
        try {
          await dbHelpers.createAuditLog(
            student.id,
            'attendance_failed_quota_exceeded',
            'qr_sessions',
            session.id,
            JSON.stringify({
              actor_id: student.id,
              actor_role: student.role,
              target_table: 'qr_sessions',
              target_id: session.id,
              result: 'failed',
              reason: 'quota_exceeded',
              max_scans: metadata.max_scans,
            })
          );
        } catch (auditErr) {
          console.warn('Failed to log quota exceeded:', auditErr);
        }

        return errorResponse(ApiError.validation('Phiên QR đã đạt giới hạn lượt quét'));
      }

      if (errMsg.includes('UNIQUE')) {
        // Constraint violation (should not happen due to anti-duplicate check, but defensive)
        try {
          await dbHelpers.createAuditLog(
            student.id,
            'attendance_failed_duplicate',
            'qr_sessions',
            session.id,
            JSON.stringify({
              actor_id: student.id,
              actor_role: student.role,
              target_table: 'qr_sessions',
              target_id: session.id,
              result: 'failed',
              reason: 'duplicate_attendance',
            })
          );
        } catch (auditErr) {
          console.warn('Failed to log duplicate attempt:', auditErr);
        }

        return successResponse(
          { already_recorded: true },
          'Điểm danh đã được ghi nhận trước đó',
          200
        );
      }

      // Generic transaction error
      console.error('Attendance transaction error:', err);
      try {
        await dbHelpers.createAuditLog(
          student.id,
          'attendance_failed_transaction_error',
          'qr_sessions',
          session.id,
          JSON.stringify({
            actor_id: student.id,
            actor_role: student.role,
            target_table: 'qr_sessions',
            target_id: session.id,
            result: 'failed',
            reason: 'transaction_error',
          })
        );
      } catch (auditErr) {
        console.warn('Failed to log transaction error:', auditErr);
      }

      return errorResponse(
        ApiError.internalError('Lỗi khi ghi nhận điểm danh. Vui lòng thử lại.')
      );
    }

    // ============================================
    // 8. HANDLE IDEMPOTENT RESPONSE
    // ============================================
    if (alreadyRecorded) {
      // Audit: duplicate attempt (not an error, just informational)
      try {
        await dbHelpers.createAuditLog(
          student.id,
          'attendance_already_recorded',
          'qr_sessions',
          session.id,
          JSON.stringify({
            actor_id: student.id,
            actor_role: student.role,
            target_table: 'qr_sessions',
            target_id: session.id,
            result: 'already_recorded',
          })
        );
      } catch (auditErr) {
        console.warn('Failed to log duplicate attempt:', auditErr);
      }

      return successResponse(
        { already_recorded: true },
        'Điểm danh đã được ghi nhận trước đó',
        200
      );
    }

    // ============================================
    // 9. SUCCESS: AUDIT LOG & FINALIZATION
    // ============================================
    try {
      await dbHelpers.createAuditLog(
        student.id,
        'attendance_qr_scanned',
        'attendance_records',
        attendanceResult?.lastID ?? null,
        JSON.stringify({
          actor_id: student.id,
          actor_role: student.role,
          target_table: 'attendance_records',
          target_id: attendanceResult?.lastID ?? null,
          result: 'success',
          session_id: session.id,
          activity_id: session.activity_id,
          participated_updated: participationUpdateChanges > 0,
          single_use_deactivated: metadata.single_use ? true : false,
        })
      );
    } catch (auditErr) {
      console.error('Failed to create success audit log:', auditErr);
      // Non-critical: don't fail the successful attendance response
    }

    // Post-insert side effect: Send notification to student (best-effort, non-critical)
    try {
      await dbRun(
        `INSERT INTO notifications (user_id, type, title, message, related_table, related_id, is_read, created_at)
         VALUES (?, 'attendance', ?, ?, 'activities', ?, 0, datetime('now'))`,
        [
          student.id,
          'Điểm danh thành công',
          'Bạn đã điểm danh hoạt động thành công qua mã QR.',
          session.activity_id,
        ]
      );
    } catch (notifyErr) {
      console.warn('Attendance notification error:', notifyErr);
      // Non-critical: don't fail the response if notification fails
    }

    return successResponse(
      {
        recorded: true,
        attendance_id: attendanceResult?.lastID,
        activity_id: session.activity_id,
      },
      'Điểm danh thành công',
      200
    );
  } catch (error: any) {
    console.error('Attendance validation error:', error);
    return errorResponse(ApiError.internalError('Lỗi máy chủ nội bộ'));
  }
}
