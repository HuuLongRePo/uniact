import { dbGet, dbHelpers } from '@/lib/database';
import { ApiError } from '@/lib/api-response';

export type ApprovalDecisionAction = 'approve' | 'reject';

export async function requirePendingApprovalOrThrow(activityId: number) {
  const pendingApproval = (await dbGet(
    `SELECT id FROM activity_approvals
     WHERE activity_id = ? AND status = 'requested'
     ORDER BY requested_at DESC LIMIT 1`,
    [activityId]
  )) as { id: number } | undefined;

  if (!pendingApproval?.id) {
    throw ApiError.conflict('Không tìm thấy yêu cầu phê duyệt đang chờ xử lý');
  }

  return pendingApproval;
}

export async function decideActivityApproval(params: {
  activityId: number;
  actorId: number;
  action: ApprovalDecisionAction;
  notes?: string | null;
}) {
  const approvalStatus = params.action === 'approve' ? 'approved' : 'rejected';
  const newActivityStatus = params.action === 'approve' ? 'published' : 'draft';

  const pendingApproval = await requirePendingApprovalOrThrow(params.activityId);

  try {
    await dbHelpers.decideApproval(
      pendingApproval.id,
      params.actorId,
      approvalStatus as 'approved' | 'rejected',
      params.notes || null
    );
  } catch (error: any) {
    if (String(error?.message || '').includes('already processed')) {
      throw ApiError.conflict('Yêu cầu phê duyệt đã được xử lý trước đó');
    }
    if (String(error?.message || '').includes('not found')) {
      throw ApiError.notFound('Không tìm thấy yêu cầu phê duyệt');
    }
    throw error;
  }

  return {
    approval_status: approvalStatus,
    status: newActivityStatus,
  };
}
