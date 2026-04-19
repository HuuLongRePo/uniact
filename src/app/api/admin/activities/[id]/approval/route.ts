import { NextRequest } from 'next/server';
import { requireApiRole } from '@/lib/guards';
import { dbGet } from '@/lib/database';
import { cache } from '@/lib/cache';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import { decideActivityApproval } from '@/lib/approval-lifecycle';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiRole(request, ['admin']);

    const { id } = await params;
    const activityId = Number(id);
    if (!activityId || Number.isNaN(activityId)) {
      return errorResponse(ApiError.validation('ID hoạt động không hợp lệ'));
    }

    let body: { action?: string; notes?: string };
    try {
      body = await request.json();
    } catch {
      return errorResponse(ApiError.badRequest('Dữ liệu JSON không hợp lệ'));
    }
    const { action, notes } = body;

    if (!['approve', 'reject'].includes(action ?? '')) {
      return errorResponse(
        ApiError.validation('Hành động không hợp lệ', { action: 'Phải là "approve" hoặc "reject"' })
      );
    }

    if (action === 'reject' && !notes?.trim()) {
      return errorResponse(
        ApiError.validation('Cần ghi chú khi từ chối', { notes: 'Vui lòng nhập lý do từ chối' })
      );
    }

    // Verify activity exists and is approvable
    const activity = await dbGet(
      'SELECT id, teacher_id, status, approval_status, approval_notes, title FROM activities WHERE id = ?',
      [activityId]
    );
    if (!activity) {
      return errorResponse(ApiError.notFound('Không tìm thấy hoạt động'));
    }

    if (activity.approval_status === 'approved' || activity.status === 'published') {
      return errorResponse(ApiError.conflict('Hoạt động đã được phê duyệt trước đó'));
    }

    // Try to use existing approval record (from submit-for-approval flow)
    const pendingApproval = (await dbGet(
      `SELECT id FROM activity_approvals
       WHERE activity_id = ? AND status = 'requested'
       ORDER BY requested_at DESC LIMIT 1`,
      [activityId]
    )) as { id: number } | undefined;

    const isPendingApproval = activity.approval_status === 'requested';
    if (!pendingApproval && !isPendingApproval) {
      return errorResponse(
        ApiError.validation(
          `Không thể ${action === 'approve' ? 'phê duyệt' : 'từ chối'} hoạt động ở trạng thái: ${activity.approval_status}`
        )
      );
    }

    if (!pendingApproval) {
      return errorResponse(ApiError.conflict('Không tìm thấy yêu cầu phê duyệt đang chờ xử lý'));
    }

    const decision = await decideActivityApproval({
      activityId,
      actorId: user.id,
      action: action as 'approve' | 'reject',
      notes: notes || null,
    });

    cache.invalidatePrefix('activities:');

    return successResponse(
      { status: decision.status, approval_status: decision.approval_status },
      action === 'approve' ? 'Hoạt động đã được phê duyệt' : 'Hoạt động đã bị từ chối'
    );
  } catch (error: any) {
    console.error('Approval error:', error);
    const apiLikeError =
      error instanceof ApiError ||
      (error && typeof error.status === 'number' && typeof error.code === 'string')
        ? error
        : ApiError.internalError('Lỗi máy chủ nội bộ');
    return errorResponse(apiLikeError);
  }
}
