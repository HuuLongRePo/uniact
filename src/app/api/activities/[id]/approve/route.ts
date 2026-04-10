import { NextRequest } from 'next/server';
import { requireApiRole } from '@/lib/guards';
import { dbGet, dbHelpers } from '@/lib/database';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import { canDecideApproval } from '@/lib/activity-workflow';

/**
 * POST /api/activities/[id]/approve
 * Admin phê duyệt activity
 * Pending signal: approval_status='requested' -> published
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    let user;
    try {
      user = await requireApiRole(request, ['admin']);
    } catch (error: any) {
      if (error instanceof ApiError) {
        return errorResponse(error);
      }
      throw error;
    }

    const { id } = await params;
    const activityId = Number(id);
    if (!activityId || Number.isNaN(activityId)) {
      return errorResponse(ApiError.validation('ID hoạt động không hợp lệ'));
    }

    const { notes } = await request.json();

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
      if (activity.approval_status === 'approved' || activity.status === 'published') {
        return errorResponse(ApiError.conflict('Hoạt động đã được phê duyệt trước đó'));
      }
      return errorResponse(ApiError.validation(approvalCheck.error || 'Không thể phê duyệt'));
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
      await dbHelpers.decideApproval(pendingApproval.id, user.id, 'approved', notes || null);
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
        approval_status: 'approved',
        new_status: 'published',
      },
      'Phê duyệt hoạt động thành công'
    );
  } catch (error: any) {
    console.error('Error approving activity:', error);
    return errorResponse(
      ApiError.internalError('Không thể phê duyệt hoạt động', { details: error?.message })
    );
  }
}
