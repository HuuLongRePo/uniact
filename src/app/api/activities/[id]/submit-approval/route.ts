import { NextRequest } from 'next/server';
import { requireApiRole } from '@/lib/guards';
import { dbGet, dbHelpers } from '@/lib/database';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import { canSubmitForApproval } from '@/lib/activity-workflow';

/**
 * POST /api/activities/[id]/submit-approval
 * Teacher gửi activity để admin phê duyệt
 * Pending signal: approval_status='requested'
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiRole(request, ['teacher']);

    const { id } = await params;
    const activityId = Number(id);
    if (!activityId || Number.isNaN(activityId)) {
      return errorResponse(ApiError.validation('ID hoạt động không hợp lệ'));
    }

    // Kiểm tra activity tồn tại và thuộc về teacher
    const activity = await dbGet(
      `SELECT id, title, teacher_id, status, approval_status FROM activities WHERE id = ?`,
      [activityId]
    );

    if (!activity) {
      return errorResponse(ApiError.notFound('Không tìm thấy hoạt động'));
    }

    if (activity.teacher_id !== user.id) {
      return errorResponse(ApiError.forbidden('Bạn chỉ có thể gửi hoạt động do bạn tạo'));
    }

    const submitCheck = canSubmitForApproval(
      activity.status as any,
      activity.approval_status as any
    );
    if (!submitCheck.valid) {
      return errorResponse(ApiError.conflict(submitCheck.error || 'Không thể gửi phê duyệt'));
    }

    const result = await dbHelpers.submitActivityForApproval(activityId, user.id);
    if ((result as any).alreadyPending) {
      return errorResponse(ApiError.conflict('Hoạt động đã được gửi để phê duyệt'));
    }

    await dbHelpers.notifyAdminsOfApprovalSubmission?.(
      activityId,
      String(user.name || 'Người dùng'),
      activity.title
    );

    return successResponse(
      { activity_id: activityId, approval_id: result.lastID, new_status: 'draft' },
      'Đã gửi hoạt động để phê duyệt'
    );
  } catch (error: any) {
    console.error('Error submitting approval:', error);
    return errorResponse(
      ApiError.internalError('Không thể gửi hoạt động để phê duyệt', { details: error?.message })
    );
  }
}
