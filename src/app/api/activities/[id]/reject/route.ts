import { NextRequest } from 'next/server';
import { requireApiRole } from '@/lib/guards';
import { dbGet } from '@/lib/database';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import { canDecideApproval } from '@/lib/activity-workflow';
import { decideActivityApproval } from '@/lib/approval-lifecycle';

/**
 * POST /api/activities/[id]/reject
 * Admin từ chối activity
 * Pending signal: approval_status='requested' -> draft (để teacher có thể chỉnh sửa lại)
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiRole(request, ['admin']);

    const { id } = await params;
    const activityId = Number(id);
    if (!activityId || Number.isNaN(activityId)) {
      return errorResponse(ApiError.validation('ID hoạt động không hợp lệ'));
    }

    const { reason } = await request.json();

    if (!reason || reason.trim() === '') {
      return errorResponse(ApiError.validation('Vui lòng nhập lý do từ chối'));
    }

    // Kiểm tra activity tồn tại
    const activity = await dbGet(
      `SELECT id, title, teacher_id, status, approval_status, approval_notes FROM activities WHERE id = ?`,
      [activityId]
    );

    if (!activity) {
      return errorResponse(ApiError.notFound('Không tìm thấy hoạt động'));
    }

    const approvalCheck = canDecideApproval(activity.approval_status as any);
    if (!approvalCheck.valid) {
      return errorResponse(ApiError.validation(approvalCheck.error || 'Không thể từ chối'));
    }

    const pendingApproval = (await dbGet(
      `SELECT id FROM activity_approvals
       WHERE activity_id = ? AND status = 'requested'
       ORDER BY requested_at DESC LIMIT 1`,
      [activityId]
    )) as { id: number } | undefined;

    if (!pendingApproval?.id) {
      return errorResponse(ApiError.conflict('Không tìm thấy yêu cầu phê duyệt đang chờ xử lý'));
    }

    const decision = await decideActivityApproval({
      activityId,
      actorId: user.id,
      action: 'reject',
      notes: reason,
    });

    return successResponse(
      {
        activity_id: activityId,
        approval_status: decision.approval_status,
        new_status: decision.status,
        reason,
      },
      'Đã từ chối hoạt động'
    );
  } catch (error: any) {
    console.error('Error rejecting activity:', error);
    return errorResponse(
      ApiError.internalError('Không thể từ chối hoạt động', { details: error?.message })
    );
  }
}
