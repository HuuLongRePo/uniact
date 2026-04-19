import { dbGet, dbHelpers } from '@/lib/database';
import { ApiError } from '@/lib/api-response';
import { canSubmitForApproval } from '@/lib/activity-workflow';

export type SubmitApprovalActor = {
  id: number;
  role: string;
  name?: string | null;
};

export async function submitActivityForApprovalOrThrow(params: {
  activityId: number;
  actor: SubmitApprovalActor;
  note?: string | null;
  requireCompleteFields?: boolean;
}) {
  const activity = (await dbGet(
    `SELECT id, title, description, date_time, location, teacher_id, status, approval_status
     FROM activities WHERE id = ?`,
    [params.activityId]
  )) as
    | {
        id: number;
        title: string;
        description?: string | null;
        date_time?: string | null;
        location?: string | null;
        teacher_id: number;
        status: string;
        approval_status: string;
      }
    | undefined;

  if (!activity) {
    throw ApiError.notFound('Không tìm thấy hoạt động');
  }

  if (params.actor.role === 'teacher' && activity.teacher_id !== params.actor.id) {
    throw ApiError.forbidden('Bạn chỉ có thể gửi phê duyệt hoạt động của mình');
  }

  const submitCheck = canSubmitForApproval(activity.status as any, activity.approval_status as any);
  if (!submitCheck.valid) {
    throw ApiError.conflict(submitCheck.error || 'Không thể gửi hoạt động để phê duyệt');
  }

  if (params.requireCompleteFields) {
    if (!activity.title || !activity.description || !activity.date_time || !activity.location) {
      throw ApiError.validation('Hoạt động thiếu thông tin bắt buộc');
    }
  }

  const result = await dbHelpers.submitActivityForApproval(
    params.activityId,
    params.actor.id,
    params.note || null
  );

  if ((result as any).alreadyPending) {
    throw ApiError.conflict('Hoạt động đã được gửi để phê duyệt');
  }

  await dbHelpers.notifyAdminsOfApprovalSubmission?.(
    params.activityId,
    String(params.actor.name || 'Người dùng'),
    activity.title
  );

  return {
    activity,
    approvalId: result.lastID,
  };
}
