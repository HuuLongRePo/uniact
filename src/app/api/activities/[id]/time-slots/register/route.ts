import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/guards';
import { registerForSlot } from '@/lib/time-slots';
import { dbGet } from '@/lib/database';
import { ApiError, errorResponse } from '@/lib/api-response';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    let user;
    try {
      user = await requireRole(req, ['student']);
    } catch (err: any) {
      const message = String(err?.message || '');
      return errorResponse(
        message.includes('Không có quyền')
          ? ApiError.forbidden('Chỉ học viên mới có thể đăng ký khung giờ')
          : ApiError.unauthorized('Chưa đăng nhập')
      );
    }

    const body = await req.json();
    const slotId = Number(body.slotId);
    const { id } = await params;
    const activityId = Number(id);

    if (!activityId || Number.isNaN(activityId)) {
      return errorResponse(ApiError.validation('ID hoạt động không hợp lệ'));
    }
    if (!slotId || Number.isNaN(slotId)) {
      return errorResponse(ApiError.validation('ID khung giờ không hợp lệ'));
    }

    // Find participation id for user & activity
    const participation = (await dbGet(
      'SELECT id FROM participations WHERE activity_id = ? AND student_id = ?',
      [activityId, user.id]
    )) as { id?: number } | undefined;
    if (!participation?.id) return errorResponse(ApiError.validation('Bạn chưa đăng ký hoạt động'));
    const res = await registerForSlot(participation.id, slotId);
    return NextResponse.json(res);
  } catch (err: any) {
    return errorResponse(ApiError.validation(err?.message || 'Đăng ký khung giờ thất bại'));
  }
}
