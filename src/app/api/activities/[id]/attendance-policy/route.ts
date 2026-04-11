import { NextRequest } from 'next/server';
import { dbAll, dbGet } from '@/lib/database';
import { requireApiAuth } from '@/lib/guards';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import { buildAttendancePolicy } from '@/lib/attendance-policy';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireApiAuth(request);

    const { id } = await params;
    const activityId = Number(id);

    if (!Number.isFinite(activityId)) {
      throw new ApiError('ID hoạt động không hợp lệ', 400, 'INVALID_ACTIVITY_ID');
    }

    const activity = await dbGet(
      `SELECT id, title, status, approval_status, max_participants, date_time
       FROM activities
       WHERE id = ?`,
      [activityId]
    );

    if (!activity) {
      throw new ApiError('Không tìm thấy hoạt động', 404, 'ACTIVITY_NOT_FOUND');
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

    const policy = buildAttendancePolicy({
      status: activity.status,
      approvalStatus: activity.approval_status,
      maxParticipants: activity.max_participants,
      participationCount,
      mandatoryClassCount,
      voluntaryClassCount,
      activityDateTime: activity.date_time,
    });

    return successResponse({
      activity: {
        id: activity.id,
        title: activity.title,
        status: activity.status,
        approval_status: activity.approval_status,
        max_participants: activity.max_participants,
        date_time: activity.date_time,
      },
      counts: {
        participation_count: participationCount,
        mandatory_class_count: mandatoryClassCount,
        voluntary_class_count: voluntaryClassCount,
      },
      policy,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
