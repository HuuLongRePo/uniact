/**
 * Submit Activity for Approval
 * PATCH /api/activities/[id]/submit
 *
 * Teacher submits draft activity for admin approval
 * Pending signal: approval_status='requested'
 */

import { NextRequest } from 'next/server';
import { requireApiRole } from '@/lib/guards';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import { submitActivityForApprovalOrThrow } from '@/lib/submit-approval';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiRole(request, ['teacher']);

    const { id } = await params;
    const activityId = Number(id);
    if (!activityId || Number.isNaN(activityId)) {
      return errorResponse(ApiError.validation('ID hoạt động không hợp lệ'));
    }

    let note: string | null = null;
    try {
      const body = await request.json();
      if (typeof body?.note === 'string' && body.note.trim()) {
        note = body.note.trim();
      }
    } catch {
      note = null;
    }

    const submission = await submitActivityForApprovalOrThrow({
      activityId,
      actor: user,
      note,
      requireCompleteFields: true,
    });

    return successResponse(
      {
        activity: {
          id: submission.activity.id,
          title: submission.activity.title,
          status: 'draft',
          approval_status: 'requested',
          submitted_at: new Date().toISOString(),
        },
        activity_id: activityId,
        approval_id: submission.approvalId,
      },
      'Đã gửi hoạt động để phê duyệt'
    );
  } catch (error: any) {
    console.error('Submit activity error:', error);
    return errorResponse(
      error instanceof ApiError ||
        (error && typeof error.status === 'number' && typeof error.code === 'string')
        ? error
        : ApiError.internalError('Không thể gửi hoạt động để phê duyệt')
    );
  }
}
