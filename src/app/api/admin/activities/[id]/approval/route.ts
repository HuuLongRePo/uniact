import { NextRequest } from 'next/server';
import { requireApiRole } from '@/lib/guards';
import { dbHelpers, dbGet } from '@/lib/database';
import { cache } from '@/lib/cache';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

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

    const approvalStatus = action === 'approve' ? 'approved' : 'rejected';
    const newActivityStatus = action === 'approve' ? 'published' : 'draft';

    let approvalId = pendingApproval?.id;
    if (!approvalId && isPendingApproval) {
      if (!activity.teacher_id) {
        return errorResponse(
          ApiError.conflict('Không thể khôi phục yêu cầu phê duyệt cho hoạt động này')
        );
      }

      const submitRes = await dbHelpers.submitActivityForApproval(
        activityId,
        activity.teacher_id,
        activity.approval_notes || null
      );
      approvalId = submitRes.lastID ? Number(submitRes.lastID) : undefined;
    }

    if (!approvalId) {
      return errorResponse(ApiError.conflict('Không tìm thấy yêu cầu phê duyệt đang chờ xử lý'));
    }

    try {
      await dbHelpers.decideApproval(
        approvalId,
        user.id,
        approvalStatus as 'approved' | 'rejected',
        notes || null
      );
    } catch (error: any) {
      if (String(error?.message || '').includes('already processed')) {
        return errorResponse(ApiError.conflict('Yêu cầu phê duyệt đã được xử lý trước đó'));
      }
      if (String(error?.message || '').includes('not found')) {
        return errorResponse(ApiError.notFound('Không tìm thấy yêu cầu phê duyệt'));
      }
      throw error;
    }

    // Invalidate cache
    cache.invalidatePrefix('activities:');

    return successResponse(
      { status: newActivityStatus, approval_status: approvalStatus },
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
