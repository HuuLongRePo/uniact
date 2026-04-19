import { NextRequest } from 'next/server';
import { requireApiRole } from '@/lib/guards';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import { submitActivityForApprovalOrThrow } from '@/lib/submit-approval';

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

    const submission = await submitActivityForApprovalOrThrow({
      activityId,
      actor: user,
    });

    return successResponse(
      {
        activity_id: activityId,
        approval_id: submission.approvalId,
        new_status: 'draft',
        approval_status: 'requested',
      },
      'Đã gửi hoạt động để phê duyệt'
    );
  } catch (error: any) {
    console.error('Error submitting approval:', error);
    return errorResponse(
      error instanceof ApiError ||
        (error && typeof error.status === 'number' && typeof error.code === 'string')
        ? error
        : ApiError.internalError('Không thể gửi hoạt động để phê duyệt', { details: error?.message })
    );
  }
}
