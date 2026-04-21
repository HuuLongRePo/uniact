import { NextRequest } from 'next/server';
import { requireApiRole } from '@/lib/guards';
import { dbHelpers, dbGet } from '@/lib/database';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    // allow admin to see all; teachers only see approvals for their activities
    const user = await requireApiRole(request, ['admin', 'teacher']);

    const rows = await dbHelpers.getPendingApprovals();
    let filtered = rows;
    if (user.role === 'teacher') {
      filtered = (rows || []).filter((r: any) => Number(r.teacher_id) === Number(user.id));
    }

    return successResponse({ approvals: filtered || [] });
  } catch (error: any) {
    console.error('Get approvals error:', error);
    return errorResponse(ApiError.internalError('Lỗi máy chủ nội bộ'));
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiRole(request, ['admin']);

    const body = await request.json();
    const { approval_id, action, note } = body;
    if (!approval_id || !action || (action !== 'approved' && action !== 'rejected')) {
      return errorResponse(ApiError.validation('Dữ liệu gửi lên không hợp lệ'));
    }

    const row = (await dbGet(
      `SELECT aa.id
       FROM activity_approvals aa
       WHERE aa.id = ?`,
      [Number(approval_id)]
    )) as { id: number } | undefined;

    if (!row) return errorResponse(ApiError.notFound('Không tìm thấy yêu cầu duyệt'));

    try {
      await dbHelpers.decideApproval(Number(approval_id), user.id, action, note || null);
    } catch (error: any) {
      if (String(error?.message || '').includes('already processed')) {
        return errorResponse(ApiError.conflict('Yêu cầu duyệt đã được xử lý'));
      }
      if (String(error?.message || '').includes('not found')) {
        return errorResponse(ApiError.notFound('Không tìm thấy yêu cầu duyệt'));
      }
      throw error;
    }

    return successResponse({ approved: true }, `Approval ${action}`);
  } catch (error: any) {
    console.error('Decide approval error:', error);
    return errorResponse(ApiError.internalError('Lỗi máy chủ nội bộ'));
  }
}
