/**
 * Submit Activity for Approval
 * PATCH /api/activities/[id]/submit
 *
 * Teacher submits draft activity for admin approval
 * Pending signal: approval_status='requested'
 */

import { NextRequest } from 'next/server';
import { requireApiRole } from '@/lib/guards';
import { dbGet, dbHelpers } from '@/lib/database';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import { canSubmitForApproval } from '@/lib/activity-workflow';

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

    // Get activity
    const activity = (await dbGet(
      `SELECT id, title, description, date_time, location, teacher_id, status, approval_status, max_participants
       FROM activities WHERE id = ?`,
      [activityId]
    )) as any;

    if (!activity) {
      return errorResponse(ApiError.notFound('Không tìm thấy hoạt động'));
    }

    // Verify ownership
    if (activity.teacher_id !== user.id) {
      return errorResponse(ApiError.forbidden('Không có quyền truy cập'));
    }

    const submitCheck = canSubmitForApproval(activity.status, activity.approval_status);
    if (!submitCheck.valid) {
      return errorResponse(
        ApiError.conflict(submitCheck.error || 'Không thể gửi hoạt động để phê duyệt')
      );
    }

    // Validate activity has required fields
    if (!activity.title || !activity.description || !activity.date_time || !activity.location) {
      return errorResponse(ApiError.validation('Hoạt động thiếu thông tin bắt buộc'));
    }

    const result = await dbHelpers.submitActivityForApproval(activityId, user.id, note);
    if ((result as any).alreadyPending) {
      return errorResponse(ApiError.conflict('Hoạt động đã được gửi để phê duyệt'));
    }

    await dbHelpers.notifyAdminsOfApprovalSubmission?.(
      activityId,
      String(user.name || 'Người dùng'),
      activity.title
    );

    return successResponse(
      {
        activity: {
          id: activity.id,
          title: activity.title,
          status: 'draft',
          approval_status: 'requested',
          submitted_at: new Date().toISOString(),
        },
        approval_id: result.lastID,
      },
      'Đã gửi hoạt động để phê duyệt'
    );
  } catch (error: any) {
    console.error('Submit activity error:', error);
    return errorResponse(ApiError.internalError('Không thể gửi hoạt động để phê duyệt'));
  }
}
