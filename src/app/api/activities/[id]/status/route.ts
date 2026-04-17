/**
 * API Route: Update Activity Status
 * PUT /api/activities/[id]/status
 *
 * Implements 7-step workflow status transitions
 */

import { NextRequest } from 'next/server';
import { dbGet, dbRun, dbReady } from '@/lib/database';
import { requireApiRole } from '@/lib/guards';
import { validateTransition, type ActivityStatus, getStatusLabel } from '@/lib/activity-workflow';
import { dbHelpers } from '@/lib/database';
import { cache } from '@/lib/cache';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbReady();

    const user = await requireApiRole(request, ['admin', 'teacher']);

    const { id } = await params;
    const activityId = parseInt(id);
    if (isNaN(activityId)) {
      return errorResponse(ApiError.validation('ID không hợp lệ'));
    }

    const { status: newStatus } = await request.json();
    if (!newStatus) {
      return errorResponse(ApiError.validation('Thiếu trường status'));
    }

    // Get current activity
    const activity = (await dbGet('SELECT * FROM activities WHERE id = ?', [activityId])) as any;

    if (!activity) {
      return errorResponse(ApiError.notFound('Không tìm thấy hoạt động'));
    }

    // Teachers can only modify their own activities (except admins)
    if (user.role === 'teacher' && activity.teacher_id !== user.id) {
      return errorResponse(ApiError.forbidden('Bạn chỉ có thể thay đổi hoạt động của mình'));
    }

    // Validate transition (legacy check + new engine for double safety)
    const transition = validateTransition(
      activity.status as ActivityStatus,
      newStatus as ActivityStatus,
      user.role as 'admin' | 'teacher' | 'student',
      activity
    );

    if (!transition.valid) {
      return errorResponse(
        ApiError.validation(transition.error || 'Không thể thay đổi trạng thái')
      );
    }

    // Update status
    await dbRun('UPDATE activities SET status = ? WHERE id = ?', [newStatus, activityId]);

    // Invalidate activities cache
    cache.invalidatePrefix('activities:');

    // Auto-update approval_status when publishing
    if (newStatus === 'published' && activity.approval_status === 'requested') {
      await dbRun('UPDATE activities SET approval_status = ? WHERE id = ?', [
        'approved',
        activityId,
      ]);
    }

    // Create audit log
    await dbHelpers.createAuditLog(
      user.id,
      'UPDATE',
      'activities',
      activityId,
      JSON.stringify({
        field: 'status',
        old_value: activity.status,
        new_value: newStatus,
        old_label: getStatusLabel(activity.status),
        new_label: getStatusLabel(newStatus),
      })
    );

    // Create notification for teacher if admin changed status
    if (user.role === 'admin' && activity.teacher_id !== user.id) {
      await dbRun(
        `INSERT INTO alerts (level, message, related_table, related_id, is_read, created_at)
         VALUES (?, ?, ?, ?, 0, datetime('now'))`,
        [
          'info',
          `Hoạt động "${activity.title}" đã chuyển sang trạng thái: ${getStatusLabel(newStatus)}`,
          'activities',
          activityId,
        ]
      );
    }

    return successResponse(
      {
        activity: {
          id: activityId,
          status: newStatus,
          status_label: getStatusLabel(newStatus),
        },
      },
      `Đã chuyển trạng thái sang: ${getStatusLabel(newStatus)}`
    );
  } catch (error: any) {
    console.error('Update activity status error:', error);
    return errorResponse(
      error instanceof ApiError ||
        (error && typeof error.status === 'number' && typeof error.code === 'string')
        ? error
        : ApiError.internalError('Lỗi server khi cập nhật trạng thái', error?.message)
    );
  }
}
