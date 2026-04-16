import { NextRequest } from 'next/server';
import { requireApiRole } from '@/lib/guards';
import { dbHelpers, dbGet } from '@/lib/database';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import { canSubmitForApproval } from '@/lib/activity-workflow';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireApiRole(request, ['teacher', 'admin']);

    const { id } = await params;
    const activityId = Number(id);
    if (!activityId || Number.isNaN(activityId))
      return errorResponse(ApiError.validation('ID hoạt động không hợp lệ'));

    // Verify activity exists and is in a submittable state
    const activity = (await dbGet(
      'SELECT id, title, status, approval_status, teacher_id FROM activities WHERE id = ?',
      [activityId]
    )) as
      | { id: number; title: string; status: string; approval_status: string; teacher_id: number }
      | undefined;

    if (!activity) return errorResponse(ApiError.notFound('Không tìm thấy hoạt động'));

    // Teachers can only submit their own activities
    if ((actor as any).role === 'teacher' && activity.teacher_id !== (actor as any).id) {
      return errorResponse(ApiError.forbidden('Bạn chỉ có thể gửi phê duyệt hoạt động của mình'));
    }

    const submitCheck = canSubmitForApproval(
      activity.status as any,
      activity.approval_status as any
    );
    if (!submitCheck.valid) {
      return errorResponse(ApiError.conflict(submitCheck.error || 'Không thể gửi phê duyệt'));
    }

    const result = await dbHelpers.submitActivityForApproval(activityId, (actor as any).id);
    if ((result as any).alreadyPending) {
      return errorResponse(ApiError.conflict('Hoạt động đã được gửi để phê duyệt'));
    }

    await dbHelpers.notifyAdminsOfApprovalSubmission?.(
      activityId,
      String((actor as any).name || 'Người dùng'),
      activity.title
    );

    return successResponse({ approval_id: result.lastID }, 'Đã gửi hoạt động để phê duyệt', 201);
  } catch (error: any) {
    console.error('Submit for approval error:', error);
    return errorResponse(
      error instanceof ApiError ? error : ApiError.internalError('Lỗi máy chủ nội bộ')
    );
  }
}
