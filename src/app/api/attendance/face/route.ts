import { NextRequest } from 'next/server';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import { requireApiAuth } from '@/lib/guards';
import { dbAll, dbGet, dbRun } from '@/lib/database';
import { buildAttendancePolicy } from '@/lib/attendance-policy';
import { loadAttendancePolicyConfig } from '@/lib/attendance-policy-config';

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiAuth(request);
    const body = await request.json().catch(() => ({}));

    const activityId = Number(body?.activity_id);
    if (!Number.isFinite(activityId)) {
      throw new ApiError('INVALID_ACTIVITY_ID', 'ID hoạt động không hợp lệ', 400);
    }

    const targetStudentId = user.role === 'student' ? Number(user.id) : Number(body?.student_id);

    if (!Number.isFinite(targetStudentId)) {
      throw new ApiError('INVALID_STUDENT_ID', 'Thiếu student_id hợp lệ cho face attendance', 400);
    }

    const confidenceScore = Number(body?.confidence_score ?? body?.confidenceScore ?? 0);
    const upstreamVerified = Boolean(body?.upstream_verified ?? body?.upstreamVerified);
    const deviceId = body?.device_id ?? body?.deviceId ?? null;

    const activity = await dbGet(
      `SELECT id, title, status, approval_status, max_participants, date_time
       FROM activities
       WHERE id = ?`,
      [activityId]
    );

    if (!activity) {
      throw new ApiError('ACTIVITY_NOT_FOUND', 'Không tìm thấy hoạt động', 404);
    }

    let classRows: Array<{ participation_mode?: string | null }> = [];
    try {
      classRows = await dbAll(
        `SELECT participation_mode FROM activity_classes WHERE activity_id = ?`,
        [activityId]
      );
    } catch {
      classRows = [];
    }

    let participationCount = 0;
    try {
      const row = await dbGet(
        `SELECT COUNT(*) as count FROM participations WHERE activity_id = ?`,
        [activityId]
      );
      participationCount = Number(row?.count ?? 0);
    } catch {
      participationCount = 0;
    }

    const mandatoryClassCount = classRows.filter(
      (row) => String(row.participation_mode ?? '').toLowerCase() === 'mandatory'
    ).length;
    const voluntaryClassCount = classRows.filter(
      (row) => String(row.participation_mode ?? '').toLowerCase() === 'voluntary'
    ).length;

    const config = await loadAttendancePolicyConfig();

    const policy = buildAttendancePolicy(
      {
        activityId,
        status: activity.status,
        approvalStatus: activity.approval_status,
        maxParticipants: activity.max_participants,
        participationCount,
        mandatoryClassCount,
        voluntaryClassCount,
        activityDateTime: activity.date_time,
      },
      config
    );

    if (!policy.facePilot.eligible) {
      throw new ApiError(
        'FACE_PILOT_NOT_ELIGIBLE',
        'Hoạt động này chưa đủ điều kiện pilot face attendance',
        409,
        {
          recommended_mode: policy.facePilot.recommendedMode,
          preferred_primary_method: policy.facePilot.preferredPrimaryMethod,
          reasons: policy.facePilot.reasons,
        }
      );
    }

    if (!upstreamVerified) {
      throw new ApiError(
        'FACE_NOT_VERIFIED',
        'Face attendance chưa được upstream biometric layer xác thực',
        409,
        {
          recommended_fallback: 'manual',
          teacher_manual_override: policy.facePilot.teacherManualOverride,
        }
      );
    }

    if (confidenceScore < policy.facePilot.minConfidenceScore) {
      throw new ApiError(
        'FACE_LOW_CONFIDENCE',
        'Độ tin cậy của face attendance chưa đủ để tự động ghi nhận',
        409,
        {
          confidence_score: confidenceScore,
          min_confidence_score: policy.facePilot.minConfidenceScore,
          recommended_fallback: 'manual',
          teacher_manual_override: policy.facePilot.teacherManualOverride,
        }
      );
    }

    const participation = await dbGet(
      `SELECT id, attendance_status
       FROM participations
       WHERE activity_id = ? AND student_id = ?`,
      [activityId, targetStudentId]
    );

    if (!participation) {
      throw new ApiError(
        'PARTICIPATION_NOT_FOUND',
        'Học viên chưa có participation hợp lệ cho hoạt động này',
        409
      );
    }

    const existingRecord = await dbGet(
      `SELECT id, recorded_at
       FROM attendance_records
       WHERE activity_id = ? AND student_id = ?
       ORDER BY recorded_at DESC, id DESC
       LIMIT 1`,
      [activityId, targetStudentId]
    );

    if (existingRecord?.id) {
      return successResponse({
        recorded: false,
        already_recorded: true,
        method: 'face',
        activity_id: activityId,
        student_id: targetStudentId,
        confidence_score: confidenceScore,
      });
    }

    await dbRun(
      `UPDATE participations
       SET attendance_status = 'attended', updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [participation.id]
    );

    await dbRun(
      `INSERT INTO attendance_records (qr_session_id, activity_id, student_id, recorded_by, method, note, status)
       VALUES (NULL, ?, ?, ?, 'face', ?, 'recorded')`,
      [
        activityId,
        targetStudentId,
        user.id,
        JSON.stringify({
          confidence_score: confidenceScore,
          device_id: deviceId,
          source: 'face-pilot',
          upstream_verified: true,
        }),
      ]
    );

    try {
      await dbRun(
        `INSERT INTO notifications (user_id, type, title, message, related_table, related_id)
         VALUES (?, 'success', 'Face attendance thành công', ?, 'activities', ?)`,
        [
          targetStudentId,
          `Bạn đã được ghi nhận tham gia bằng face attendance cho hoạt động "${activity.title}"`,
          activityId,
        ]
      );
    } catch (notificationError) {
      console.error('Failed to create face attendance notification:', notificationError);
    }

    return successResponse({
      recorded: true,
      method: 'face',
      activity_id: activityId,
      student_id: targetStudentId,
      confidence_score: confidenceScore,
      policy: {
        preferred_primary_method: policy.facePilot.preferredPrimaryMethod,
        min_confidence_score: policy.facePilot.minConfidenceScore,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
