import { NextRequest } from 'next/server';
import { dbRun, dbAll, dbGet, dbReady, withTransaction } from '@/lib/database';
import { requireApiRole } from '@/lib/guards';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import { rateLimit } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  try {
    await dbReady();

    const rl = rateLimit(request, 10, 60 * 1000);
    if (!rl.allowed) {
      return errorResponse(
        new ApiError('RATE_LIMITED', 'Thao tác quá nhanh. Vui lòng thử lại sau ít phút.', 429)
      );
    }

    const user = await requireApiRole(request, ['admin']);

    const { activityIds } = await request.json();
    if (!Array.isArray(activityIds) || activityIds.length === 0) {
      return errorResponse(ApiError.validation('Danh sách hoạt động không hợp lệ'));
    }

    const normalizedIds = Array.from(
      new Set(activityIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))
    );

    if (normalizedIds.length === 0) {
      return errorResponse(ApiError.validation('Danh sách hoạt động không hợp lệ'));
    }

    if (normalizedIds.length > 200) {
      return errorResponse(ApiError.validation('Chỉ hỗ trợ tối đa 200 hoạt động mỗi lần duyệt'));
    }

    // Lấy các hoạt động hợp lệ (đang ở trạng thái requested)
    const placeholders = normalizedIds.map(() => '?').join(',');
    const pendingActivities = (await dbAll(
      `SELECT id, status, approval_status FROM activities WHERE id IN (${placeholders}) AND approval_status = 'requested'`,
      normalizedIds
    )) as any[];

    if (pendingActivities.length === 0) {
      return successResponse({ count: 0 }, 'Không có hoạt động nào ở trạng thái chờ duyệt');
    }

    const updatedCount = await withTransaction(async () => {
      let count = 0;
      for (const act of pendingActivities) {
        const newStatus = act.status === 'draft' ? 'published' : act.status;
        const res = await dbRun(
          `UPDATE activities 
           SET status = ?, approval_status = 'approved', approved_by = ?, approved_at = CURRENT_TIMESTAMP 
           WHERE id = ?`,
          [newStatus, user.id, act.id]
        );
        count += res.changes || 0;
      }
      return count;
    });

    return successResponse(
      {
        count: updatedCount,
      },
      `Đã phê duyệt ${updatedCount} hoạt động.`
    );
  } catch (error: any) {
    console.error('Bulk approve error:', error);
    return errorResponse(
      error instanceof ApiError
        ? error
        : ApiError.internalError('Lỗi phê duyệt hàng loạt', error?.message)
    );
  }
}
