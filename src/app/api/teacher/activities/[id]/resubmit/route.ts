import { NextRequest } from 'next/server';
import { dbGet, dbHelpers, dbReady } from '@/lib/database';
import { requireRole } from '@/lib/guards';
import { ApiError, successResponse, errorResponse } from '@/lib/api-response';

// POST /api/teacher/activities/[id]/resubmit
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbReady();
    const { id } = await params;

    let user;
    try {
      user = await requireRole(request, ['teacher', 'admin']);
    } catch {
      return errorResponse(ApiError.unauthorized('Chưa đăng nhập'));
    }

    const activityId = Number(id);
    if (!activityId || Number.isNaN(activityId)) {
      return errorResponse(ApiError.validation('ID hoạt động không hợp lệ'));
    }

    const activity = (await dbGet(
      `SELECT id, teacher_id, approval_status FROM activities WHERE id = ?`,
      [activityId]
    )) as { id: number; teacher_id: number; approval_status: string } | undefined;

    if (!activity) {
      return errorResponse(ApiError.notFound('Không tìm thấy hoạt động'));
    }

    if (user.role !== 'admin' && Number(activity.teacher_id) !== Number(user.id)) {
      return errorResponse(ApiError.forbidden('Bạn chỉ có thể gửi lại hoạt động do bạn tạo'));
    }

    const body = await request.json().catch(() => ({}));
    const message = String(body?.message || 'Gửi lại để duyệt').trim();

    const result = await dbHelpers.submitActivityForApproval(activityId, user.id, message);
    if ((result as any).alreadyPending) {
      return errorResponse(ApiError.conflict('Hoạt động đã ở trạng thái chờ duyệt'));
    }

    return successResponse({}, 'Gửi duyệt thành công');
  } catch (error: any) {
    console.error('Teacher resubmit error:', error);
    return errorResponse(
      error instanceof ApiError
        ? error
        : ApiError.internalError('Không thể gửi lại', { details: error?.message })
    );
  }
}
