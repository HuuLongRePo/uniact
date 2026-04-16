import { NextRequest } from 'next/server';
import { dbAll, dbGet } from '@/lib/database';
import { requireApiAuth } from '@/lib/guards';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import { buildAttendancePolicy, shouldTriggerQrFallback } from '@/lib/attendance-policy';
import { loadAttendancePolicyConfig } from '@/lib/attendance-policy-config';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireApiAuth(request);

    const { id } = await params;
    const activityId = Number(id);

    if (!Number.isFinite(activityId)) {
      throw new ApiError('INVALID_ACTIVITY_ID', 'ID hoạt động không hợp lệ', 400);
    }

    const body = await request.json().catch(() => ({}));
    const metrics = {
      responseTimeP95Ms: body?.responseTimeP95Ms ?? body?.response_time_p95_ms ?? null,
      queueBacklog: body?.queueBacklog ?? body?.queue_backlog ?? null,
      scanFailureRate: body?.scanFailureRate ?? body?.scan_failure_rate ?? null,
      sampleSize: body?.sampleSize ?? body?.sample_size ?? null,
    };

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
        `SELECT participation_mode
         FROM activity_classes
         WHERE activity_id = ?`,
        [activityId]
      );
    } catch {
      classRows = [];
    }

    let participationCount = 0;
    try {
      const row = await dbGet(
        `SELECT COUNT(*) as count
         FROM participations
         WHERE activity_id = ?`,
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

    const fallback = shouldTriggerQrFallback(metrics, policy.qrFallback);

    return successResponse({
      activity: {
        id: activity.id,
        title: activity.title,
      },
      metrics,
      policy,
      fallback: {
        ...fallback,
        recommended_target_mode: fallback.triggered ? 'mixed' : policy.defaultMode,
        teacher_manual_override: policy.qrFallback.allowTeacherManualOverride,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
