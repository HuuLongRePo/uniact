import { NextRequest } from 'next/server';
import { requireApiRole } from '@/lib/guards';
import { dbGet, dbHelpers } from '@/lib/database';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import { canDecideApproval } from '@/lib/activity-workflow';

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

    let pendingApproval = (await dbGet(
      `SELECT id FROM activity_approvals
       WHERE activity_id = ? AND status = 'requested'
       ORDER BY requested_at DESC LIMIT 1`,
      [activityId]
    )) as { id: number } | undefined;

    if (!pendingApproval) {
      const submitRes = await dbHelpers.submitActivityForApproval(
        activityId,
        activity.teacher_id,
        activity.approval_notes || null
      );
      pendingApproval = submitRes.lastID ? { id: Number(submitRes.lastID) } : undefined;
    }

    if (!pendingApproval?.id) {
      return errorResponse(ApiError.conflict('Không tìm thấy yêu cầu phê duyệt đang chờ xử lý'));
    }

    try {
      await dbHelpers.decideApproval(pendingApproval.id, user.id, 'rejected', reason);
    } catch (error: any) {
      if (String(error?.message || '').includes('already processed')) {
        return errorResponse(ApiError.conflict('Yêu cầu phê duyệt đã được xử lý trước đó'));
      }
      if (String(error?.message || '').includes('not found')) {
        return errorResponse(ApiError.notFound('Không tìm thấy yêu cầu phê duyệt'));
      }
      throw error;
    }

    return successResponse(
      {
        activity_id: activityId,
        approval_status: 'rejected',
        new_status: 'draft',
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
