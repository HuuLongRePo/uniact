import { NextRequest } from 'next/server';
import { requireApiRole } from '@/lib/guards';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import { submitActivityForApprovalOrThrow } from '@/lib/submit-approval';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireApiRole(request, ['teacher', 'admin']);

    const { id } = await params;
    const activityId = Number(id);
    if (!activityId || Number.isNaN(activityId))
      return errorResponse(ApiError.validation('ID hoạt động không hợp lệ'));

    const submission = await submitActivityForApprovalOrThrow({
      activityId,
      actor: actor as any,
    });

    return successResponse(
      {
        activity_id: activityId,
        approval_id: submission.approvalId,
        approval_status: 'requested',
      },
      'Đã gửi hoạt động để phê duyệt',
      201
    );
  } catch (error: any) {
    console.error('Submit for approval error:', error);
    return errorResponse(
      error instanceof ApiError ||
        (error && typeof error.status === 'number' && typeof error.code === 'string')
        ? error
        : ApiError.internalError('Lỗi máy chủ nội bộ')
    );
  }
}
