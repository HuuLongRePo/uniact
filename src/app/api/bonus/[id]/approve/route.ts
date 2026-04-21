import { NextRequest } from 'next/server';
import { dbRun, dbGet, dbHelpers } from '@/lib/database';
import { getUserFromToken } from '@/lib/auth';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

// POST /api/bonus/:id/approve - approve or reject a suggested bonus (admin only)
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const token = request.cookies.get('token')?.value;
    if (!token) return errorResponse(ApiError.unauthorized('Chưa đăng nhập'));

    const currentUser = await getUserFromToken(token);
    if (!currentUser || currentUser.role !== 'admin') {
      return errorResponse(ApiError.forbidden('Không có quyền truy cập (chỉ admin)'));
    }

    const body = await request.json();
    const action = body.action as 'approve' | 'reject';
    const note = body.note || null;

    if (!action || (action !== 'approve' && action !== 'reject')) {
      return errorResponse(ApiError.validation('Hành động không hợp lệ'));
    }

    const suggestion = await dbGet('SELECT * FROM suggested_bonus_points WHERE id = ?', [
      Number(id),
    ]);
    if (!suggestion) return errorResponse(ApiError.notFound('Không tìm thấy dữ liệu'));

    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    const updateRes = await dbRun(
      "UPDATE suggested_bonus_points SET status = ?, approver_id = ?, updated_at = datetime('now') WHERE id = ? AND status = ?",
      [newStatus, currentUser.id, Number(id), 'pending']
    );
    if ((updateRes.changes || 0) === 0) {
      return errorResponse(ApiError.validation('Đề xuất điểm thưởng đã được duyệt hoặc từ chối'));
    }

    // Audit log
    try {
      await dbHelpers.createAuditLog(
        currentUser.id,
        action === 'approve' ? 'APPROVE_SUGGESTED_BONUS' : 'REJECT_SUGGESTED_BONUS',
        'suggested_bonus_points',
        Number(id),
        note || null
      );
    } catch (auditErr) {
      console.error('Audit log error:', auditErr);
    }

    return successResponse(
      { status: newStatus },
      action === 'approve' ? 'Duyệt đề xuất điểm thưởng thành công' : 'Từ chối đề xuất điểm thưởng'
    );
  } catch (err: any) {
    console.error('POST /api/bonus/[id]/approve error:', err);
    return errorResponse(ApiError.internalError('Lỗi máy chủ nội bộ'));
  }
}
