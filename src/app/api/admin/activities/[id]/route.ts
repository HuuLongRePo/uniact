import { NextRequest } from 'next/server';
import { dbGet, dbReady, dbRun } from '@/lib/database';
import { requireApiRole } from '@/lib/guards';
import { getActivityDisplayStatus } from '@/lib/activity-workflow';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

async function getAdminActivityDetail(activityId: number | string) {
  const activity = (await dbGet(
    `SELECT 
      a.*, 
      at.name as activity_type_name,
      ol.name as organization_level_name,
      u.name as creator_name
    FROM activities a
    LEFT JOIN activity_types at ON a.activity_type_id = at.id
    LEFT JOIN organization_levels ol ON a.organization_level_id = ol.id
    LEFT JOIN users u ON a.teacher_id = u.id
    WHERE a.id = ?`,
    [activityId]
  )) as any;

  if (!activity) {
    throw ApiError.notFound('Không tìm thấy hoạt động');
  }

  return {
    ...activity,
    status: getActivityDisplayStatus(activity.status, activity.approval_status),
  };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbReady();
    await requireApiRole(request, ['admin']);

    const { id } = await params;
    const activityId = Number(id);
    if (!activityId || Number.isNaN(activityId)) {
      return errorResponse(ApiError.validation('ID hoạt động không hợp lệ'));
    }

    const activity = await getAdminActivityDetail(activityId);
    return successResponse({ activity });
  } catch (error: any) {
    console.error('Get activity error:', error);
    return errorResponse(
      error instanceof ApiError ||
        (error && typeof error.status === 'number' && typeof error.code === 'string')
        ? error
        : ApiError.internalError('Không thể tải thông tin hoạt động', {
            details: error?.message,
          })
    );
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbReady();
    const user = await requireApiRole(request, ['admin']);

    const { id } = await params;
    const activityId = Number(id);
    if (!activityId || Number.isNaN(activityId)) {
      return errorResponse(ApiError.validation('ID hoạt động không hợp lệ'));
    }

    const body = await request.json();
    const allowedFields = [
      'title',
      'description',
      'date_time',
      'end_time',
      'location',
      'max_participants',
      'activity_type_id',
      'organization_level_id',
    ] as const;

    const updates: Record<string, any> = {};
    for (const key of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(body, key)) {
        updates[key] = body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return errorResponse(ApiError.validation('Không có thay đổi nào được gửi lên'));
    }

    const existing = await dbGet('SELECT id FROM activities WHERE id = ?', [activityId]);
    if (!existing) {
      return errorResponse(ApiError.notFound('Không tìm thấy hoạt động'));
    }

    const sets: string[] = [];
    const bindings: any[] = [];
    for (const [key, value] of Object.entries(updates)) {
      sets.push(`${key} = ?`);
      bindings.push(value);
    }
    sets.push('updated_at = CURRENT_TIMESTAMP');

    await dbRun(`UPDATE activities SET ${sets.join(', ')} WHERE id = ?`, [...bindings, activityId]);

    try {
      await dbRun(
        'INSERT INTO audit_logs (actor_id, action, target_table, target_id, details) VALUES (?, ?, ?, ?, ?)',
        [
          user.id,
          'UPDATE_ACTIVITY',
          'activities',
          activityId,
          JSON.stringify({ changes: Object.keys(updates) }),
        ]
      );
    } catch (auditError) {
      console.error('Failed to write audit log (activities PUT):', auditError);
    }

    const activity = await getAdminActivityDetail(activityId);
    return successResponse({ activity });
  } catch (error: any) {
    console.error('Update activity error (admin):', error);
    return errorResponse(
      error instanceof ApiError ||
        (error && typeof error.status === 'number' && typeof error.code === 'string')
        ? error
        : ApiError.internalError('Không thể cập nhật hoạt động', {
            details: error?.message,
          })
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbReady();
    await requireApiRole(request, ['admin']);

    const { id } = await params;
    const activityId = Number(id);
    if (!activityId || Number.isNaN(activityId)) {
      return errorResponse(ApiError.validation('ID hoạt động không hợp lệ'));
    }

    const existing = await dbGet('SELECT id FROM activities WHERE id = ?', [activityId]);
    if (!existing) {
      return errorResponse(ApiError.notFound('Không tìm thấy hoạt động'));
    }

    await dbRun(
      `UPDATE activities 
       SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [activityId]
    );

    return successResponse({ success: true }, 'Đã hủy hoạt động');
  } catch (error: any) {
    console.error('Delete activity error:', error);
    return errorResponse(
      error instanceof ApiError ||
        (error && typeof error.status === 'number' && typeof error.code === 'string')
        ? error
        : ApiError.internalError('Không thể hủy hoạt động', {
            details: error?.message,
          })
    );
  }
}
