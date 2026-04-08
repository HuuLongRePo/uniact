import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/guards';
import { listSlots } from '@/lib/time-slots';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    try {
      await requireAuth(req); // any authenticated user
    } catch {
      return errorResponse(ApiError.unauthorized('Chưa đăng nhập'));
    }
    const { id } = await params;
    const activityId = Number(id);
    if (!activityId || Number.isNaN(activityId)) {
      return errorResponse(ApiError.validation('ID hoạt động không hợp lệ'));
    }
    const slots = await listSlots(activityId);
    return successResponse({ slots });
  } catch (err: any) {
    return errorResponse(ApiError.validation(err?.message || 'Không thể tải khung giờ'));
  }
}
