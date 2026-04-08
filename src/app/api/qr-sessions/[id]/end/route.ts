import { NextRequest } from 'next/server';
import { dbGet, dbRun, dbHelpers } from '@/lib/database';
import { requireApiRole } from '@/lib/guards';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiRole(request, ['teacher', 'admin']);

    const { id } = await params;
    const sessionId = Number(id);
    if (!Number.isFinite(sessionId)) {
      return errorResponse(ApiError.validation('ID phiên QR không hợp lệ'));
    }

    const session = (await dbGet('SELECT id, creator_id, is_active FROM qr_sessions WHERE id = ?', [
      sessionId,
    ])) as any;
    if (!session) return errorResponse(ApiError.notFound('Không tìm thấy phiên QR'));

    if (user.role === 'teacher' && session.creator_id !== user.id) {
      return errorResponse(ApiError.forbidden('Bạn chỉ có thể kết thúc phiên QR do mình tạo'));
    }

    if (!session.is_active) {
      return successResponse({ ended: true, already_ended: true }, 'Phiên QR đã được kết thúc trước đó');
    }

    await dbRun(
      `UPDATE qr_sessions
       SET is_active = 0, expires_at = datetime('now')
       WHERE id = ? AND is_active = 1`,
      [sessionId]
    );

    await dbHelpers.createAuditLog(
      user.id,
      'end_qr_session',
      'qr_sessions',
      sessionId,
      JSON.stringify({
        actor_id: user.id,
        actor_role: user.role,
        target_table: 'qr_sessions',
        target_id: sessionId,
        result: 'success',
      })
    );

    return successResponse({ ended: true }, 'Đã kết thúc phiên QR');
  } catch (error: any) {
    console.error('End qr session error:', error);
    return errorResponse(ApiError.internalError('Không thể kết thúc phiên QR'));
  }
}
