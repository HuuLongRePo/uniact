import { NextRequest } from 'next/server';
import { dbAll, dbGet } from '@/lib/database';
import { requireApiRole } from '@/lib/guards';
import { errorResponse, successResponse } from '@/lib/api-response';
import { buildAttendancePolicy } from '@/lib/attendance-policy';
import { loadAttendancePolicyConfig } from '@/lib/attendance-policy-config';

export async function GET(request: NextRequest) {
  try {
    const user = await requireApiRole(request, ['teacher', 'admin']);

    const activities = await dbAll(
      user.role === 'admin'
        ? `SELECT id, title, status, approval_status, max_participants, date_time, teacher_id
           FROM activities
           ORDER BY datetime(date_time) DESC, id DESC
           LIMIT 50`
        : `SELECT id, title, status, approval_status, max_participants, date_time, teacher_id
           FROM activities
           WHERE teacher_id = ?
           ORDER BY datetime(date_time) DESC, id DESC
           LIMIT 50`,
      user.role === 'admin' ? [] : [user.id]
    );

    const config = await loadAttendancePolicyConfig();
    const rows = [] as any[];

    for (const activity of activities) {
      let classRows: Array<{ participation_mode?: string | null }> = [];
      try {
        classRows = await dbAll(
          `SELECT participation_mode FROM activity_classes WHERE activity_id = ?`,
          [activity.id]
        );
      } catch {
        classRows = [];
      }

      let participationCount = 0;
      try {
        const countRow = await dbGet(
          `SELECT COUNT(*) as count FROM participations WHERE activity_id = ?`,
          [activity.id]
        );
        participationCount = Number(countRow?.count ?? 0);
      } catch {
        participationCount = 0;
      }

      const mandatoryClassCount = classRows.filter(
        (row) => String(row.participation_mode ?? '').toLowerCase() === 'mandatory'
      ).length;
      const voluntaryClassCount = classRows.filter(
        (row) => String(row.participation_mode ?? '').toLowerCase() === 'voluntary'
      ).length;

      const policy = buildAttendancePolicy(
        {
          activityId: activity.id,
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

      rows.push({
        ...activity,
        participation_count: participationCount,
        mandatory_class_count: mandatoryClassCount,
        voluntary_class_count: voluntaryClassCount,
        policy_summary: {
          eligible: policy.facePilot.eligible,
          preferred_primary_method: policy.facePilot.preferredPrimaryMethod,
          recommended_mode: policy.facePilot.recommendedMode,
          selection_mode: policy.facePilot.selectionMode,
          selected_by_config: policy.facePilot.selectedByConfig,
        },
      });
    }

    return successResponse({ activities: rows });
  } catch (error) {
    return errorResponse(error);
  }
}
