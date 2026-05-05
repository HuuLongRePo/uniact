import { NextRequest } from 'next/server';
import { dbHelpers, withTransaction } from '@/lib/database';
import { requireApiRole } from '@/lib/guards';
import { User } from '@/types/database';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import { sendDatabaseNotification } from '@/lib/notifications';
import { resolveRequestNetworkPrefix } from '@/lib/network-proximity';

function maskToken(token: string) {
  const normalized = token.trim();
  if (!normalized) return '';
  if (normalized.length <= 10) return normalized;
  return `${normalized.slice(0, 6)}...${normalized.slice(-4)}`;
}

function logAttendanceValidate(stage: string, details: Record<string, unknown>) {
  console.info('[attendance.validate]', stage, details);
}

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
    const qrToken = typeof qr_token === 'string' ? qr_token.trim() : '';
    const sessionId = Number(session_id);
    const maskedToken = maskToken(qrToken);
    const requestNetworkPrefix = resolveRequestNetworkPrefix(request);

    logAttendanceValidate('request.received', {
      sessionId: Number.isFinite(sessionId) ? sessionId : session_id ?? null,
      token: maskedToken || null,
      requestNetworkPrefix,
    });

    if (!qrToken) {
      logAttendanceValidate('request.invalid_token', {
        sessionId: Number.isFinite(sessionId) ? sessionId : null,
      });
      return errorResponse(ApiError.validation('Vui long cung cap qr_token'));
    }

    if (!Number.isInteger(sessionId) || sessionId <= 0) {
      logAttendanceValidate('request.invalid_session_id', {
        sessionId: Number.isFinite(sessionId) ? sessionId : session_id ?? null,
        token: maskedToken,
      });
      return errorResponse(ApiError.validation('session_id khong hop le'));
    }

    const user = await requireApiRole(request, ['student']);
    const student = user as User;
    logAttendanceValidate('auth.ok', {
      sessionId,
      token: maskedToken,
      studentId: Number(student.id),
    });

    const session = await dbHelpers.getQRSessionByToken(qrToken, sessionId);
    if (!session) {
      logAttendanceValidate('session.not_found', {
        sessionId,
        token: maskedToken,
        studentId: Number(student.id),
      });
      return errorResponse(ApiError.validation('Ma QR khong hop le hoac da het han'));
    }

    if (!session.is_active) {
      logAttendanceValidate('session.inactive', {
        sessionId: Number(session.id),
        token: maskedToken,
        studentId: Number(student.id),
      });
      return errorResponse(ApiError.validation('Phien QR da bi vo hieu hoa'));
    }

    const now = new Date();
    const expiresAt = new Date(session.expires_at);
    if (expiresAt <= now) {
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

      logAttendanceValidate('session.expired', {
        sessionId: Number(session.id),
        activityId: Number(session.activity_id),
        studentId: Number(student.id),
        expiresAt: session.expires_at,
      });
      return errorResponse(ApiError.validation('Ma QR da het han'));
    }

    const activity = (await dbHelpers.getActivityById(session.activity_id)) as
      | {
          id: number;
          teacher_id: number;
          status: string;
          approval_status: string;
        }
      | undefined;

    if (!activity) {
      logAttendanceValidate('activity.not_found', {
        sessionId: Number(session.id),
        activityId: Number(session.activity_id),
        studentId: Number(student.id),
      });
      return errorResponse(ApiError.notFound('Hoat dong lien quan khong ton tai hoac da bi xoa'));
    }

    if (activity.approval_status !== 'approved') {
      logAttendanceValidate('activity.not_approved', {
        sessionId: Number(session.id),
        activityId: Number(activity.id),
        studentId: Number(student.id),
        approvalStatus: activity.approval_status,
      });
      return errorResponse(
        ApiError.validation('Hoat dong chua duoc phe duyet. Khong the diem danh.')
      );
    }

    if (activity.status !== 'published' && activity.status !== 'completed') {
      logAttendanceValidate('activity.invalid_status', {
        sessionId: Number(session.id),
        activityId: Number(activity.id),
        studentId: Number(student.id),
        activityStatus: activity.status,
      });
      return errorResponse(
        ApiError.validation('Hoat dong chua duoc cong bo hoac da bi huy. Khong the diem danh.')
      );
    }

    let metadata: {
      single_use?: boolean;
      max_scans?: number | null;
      anti_cheat?: {
        network_lock?: boolean;
        creator_network_prefix?: string | null;
      };
    } = {};
    try {
      if (session.metadata) {
        metadata = JSON.parse(session.metadata);
      }
    } catch (parseErr) {
      console.warn('Failed to parse session metadata:', parseErr);
      metadata = {};
    }

    const antiCheat = metadata.anti_cheat;
    const networkLockEnabled = antiCheat?.network_lock !== false;
    const creatorNetworkPrefix = antiCheat?.creator_network_prefix ?? null;
    const currentNetworkPrefix = requestNetworkPrefix;
    logAttendanceValidate('session.loaded', {
      sessionId: Number(session.id),
      activityId: Number(session.activity_id),
      studentId: Number(student.id),
      networkLockEnabled,
      creatorNetworkPrefix,
      currentNetworkPrefix,
      singleUse: metadata.single_use ?? false,
      maxScans: metadata.max_scans ?? null,
    });

    if (networkLockEnabled) {
      if (!creatorNetworkPrefix) {
        try {
          await dbHelpers.createAuditLog(
            student.id,
            'attendance_failed_network_lock_missing',
            'qr_sessions',
            session.id,
            JSON.stringify({
              actor_id: student.id,
              actor_role: student.role,
              target_table: 'qr_sessions',
              target_id: session.id,
              result: 'failed',
              reason: 'network_lock_missing',
            })
          );
        } catch (auditErr) {
          console.warn('Failed to log missing network lock metadata:', auditErr);
        }

        logAttendanceValidate('network.lock_missing', {
          sessionId: Number(session.id),
          activityId: Number(session.activity_id),
          studentId: Number(student.id),
        });
        return errorResponse(
          ApiError.validation(
            'Phien QR chua dat chuan chong gian lan. Vui long yeu cau giang vien tao lai ma QR moi.'
          )
        );
      }

      if (!currentNetworkPrefix) {
        try {
          await dbHelpers.createAuditLog(
            student.id,
            'attendance_failed_network_unresolved',
            'qr_sessions',
            session.id,
            JSON.stringify({
              actor_id: student.id,
              actor_role: student.role,
              target_table: 'qr_sessions',
              target_id: session.id,
              result: 'failed',
              reason: 'network_unresolved',
            })
          );
        } catch (auditErr) {
          console.warn('Failed to log unresolved network prefix:', auditErr);
        }

        logAttendanceValidate('network.unresolved', {
          sessionId: Number(session.id),
          activityId: Number(session.activity_id),
          studentId: Number(student.id),
        });
        return errorResponse(
          ApiError.validation(
            'Khong the xac dinh mang hien tai. Vui long bat lai Wi-Fi/4G va quet lai ma QR tai lop.'
          )
        );
      }

      if (currentNetworkPrefix !== creatorNetworkPrefix) {
        const creatorIsLoopback = creatorNetworkPrefix === '127.0.0';
        try {
          await dbHelpers.createAuditLog(
            student.id,
            'attendance_failed_network_mismatch',
            'qr_sessions',
            session.id,
            JSON.stringify({
              actor_id: student.id,
              actor_role: student.role,
              target_table: 'qr_sessions',
              target_id: session.id,
              result: 'failed',
              reason: 'network_mismatch',
              creator_network_prefix: creatorNetworkPrefix,
              request_network_prefix: currentNetworkPrefix,
            })
          );
        } catch (auditErr) {
          console.warn('Failed to log network mismatch:', auditErr);
        }

        logAttendanceValidate('network.mismatch', {
          sessionId: Number(session.id),
          activityId: Number(session.activity_id),
          studentId: Number(student.id),
          creatorNetworkPrefix,
          currentNetworkPrefix,
        });
        return errorResponse(
          ApiError.validation(
            creatorIsLoopback
              ? 'Phien QR duoc tao tu localhost/127.0.0.1 nen khong the xac thuc tren thiet bi khac. Vui long yeu cau giang vien mo he thong bang IP LAN va tao lai ma QR.'
              : 'Phat hien mang khong trung voi mang lop hoc. Diem danh tu xa bang anh QR khong duoc chap nhan.'
          )
        );
      }
    }

    let attendanceResult: any;
    let alreadyRecorded = false;
    let participationUpdateChanges = 0;

    try {
      ({ attendanceResult, alreadyRecorded, participationUpdateChanges } = await withTransaction(
        async () => {
          if (typeof metadata.max_scans === 'number' && metadata.max_scans > 0) {
            const scanCount = await dbHelpers.countAttendanceForSession(session.id);
            if (scanCount >= metadata.max_scans) {
              throw new Error('QUOTA_EXCEEDED');
            }
          }

          const existingRecord = await dbHelpers.checkExistingAttendance(
            student.id,
            session.activity_id
          );
          if (existingRecord) {
            return {
              attendanceResult: existingRecord,
              alreadyRecorded: true,
              participationUpdateChanges: 0,
            };
          }

          const result = await dbHelpers.createAttendanceRecord(
            session.id,
            session.activity_id,
            student.id,
            student.id,
            'qr'
          );

          const updateResult = await dbHelpers.updateParticipationStatus(
            student.id,
            session.activity_id,
            'attended'
          );

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

      if (errMsg === 'QUOTA_EXCEEDED') {
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

        logAttendanceValidate('attendance.quota_exceeded', {
          sessionId: Number(session.id),
          activityId: Number(session.activity_id),
          studentId: Number(student.id),
          maxScans: metadata.max_scans ?? null,
        });
        return errorResponse(ApiError.validation('Phien QR da dat gioi han luot quet'));
      }

      if (errMsg.includes('UNIQUE')) {
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

        logAttendanceValidate('attendance.unique_duplicate', {
          sessionId: Number(session.id),
          activityId: Number(session.activity_id),
          studentId: Number(student.id),
        });
        return successResponse(
          { already_recorded: true },
          'Diem danh da duoc ghi nhan truoc do',
          200
        );
      }

      console.error('Attendance transaction error:', err);
      logAttendanceValidate('attendance.transaction_error', {
        sessionId: Number(session.id),
        activityId: Number(session.activity_id),
        studentId: Number(student.id),
        error: errMsg || String(err),
      });
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

      return errorResponse(ApiError.internalError('Loi khi ghi nhan diem danh. Vui long thu lai.'));
    }

    if (alreadyRecorded) {
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

      logAttendanceValidate('attendance.already_recorded', {
        sessionId: Number(session.id),
        activityId: Number(session.activity_id),
        studentId: Number(student.id),
      });
      return successResponse(
        { already_recorded: true },
        'Diem danh da duoc ghi nhan truoc do',
        200
      );
    }

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
    }

    try {
      await sendDatabaseNotification({
        userId: Number(student.id),
        type: 'success',
        title: 'Diem danh thanh cong',
        message: 'Ban da diem danh hoat dong thanh cong qua ma QR.',
        relatedTable: 'activities',
        relatedId: Number(session.activity_id),
        dedupeWithinSeconds: 45,
      });
    } catch (notifyErr) {
      console.warn('Attendance notification error:', notifyErr);
    }

    logAttendanceValidate('attendance.success', {
      sessionId: Number(session.id),
      activityId: Number(session.activity_id),
      studentId: Number(student.id),
      attendanceId: attendanceResult?.lastID ?? null,
      participationUpdated: participationUpdateChanges > 0,
    });
    return successResponse(
      {
        recorded: true,
        attendance_id: attendanceResult?.lastID,
        activity_id: session.activity_id,
      },
      'Diem danh thanh cong',
      200
    );
  } catch (error: any) {
    console.error('Attendance validation error:', error);
    return errorResponse(ApiError.internalError('Loi may chu noi bo'));
  }
}
