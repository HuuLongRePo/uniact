import { NextRequest } from 'next/server';
import { requireApiRole } from '@/lib/guards';
import { dbGet } from '@/lib/database';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import { canDecideApproval } from '@/lib/activity-workflow';
import { cache } from '@/lib/cache';
import { decideActivityApproval } from '@/lib/approval-lifecycle';

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
      action: 'approve',
      notes: notes || null,
    });
    cache.invalidatePrefix('activities:');

    return successResponse(
      {
        activity_id: activityId,
        approval_status: decision.approval_status,
        new_status: decision.status,
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
