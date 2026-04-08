import { NextRequest } from 'next/server';
import { PointCalculationService } from '@/lib/scoring';
import { requireRole } from '@/lib/guards';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

/**
 * POST /api/scores/calculate
 * Tính điểm cho participation (teacher/admin only)
 */
export async function POST(request: NextRequest) {
  try {
    let user;
    try {
      user = await requireRole(request, ['admin', 'teacher']);
    } catch (err: any) {
      const msg = String(err?.message || '');
      return errorResponse(
        msg.includes('Không có quyền')
          ? ApiError.forbidden('Chỉ giảng viên và quản trị viên mới được tính điểm')
          : ApiError.unauthorized('Chưa đăng nhập')
      );
    }

    const body = await request.json();
    const { participationId, bonusPoints, penaltyPoints } = body;

    if (!participationId) {
      return errorResponse(ApiError.validation('Thiếu participationId'));
    }

    const result = await PointCalculationService.calculatePoints({
      participationId,
      bonusPoints: bonusPoints || 0,
      penaltyPoints: penaltyPoints || 0,
    });

    await PointCalculationService.saveCalculation(participationId, result);

    return successResponse(result, 'Tính điểm thành công');
  } catch (error: any) {
    console.error('Error calculating points:', error);
    return errorResponse(ApiError.internalError(error.message || 'Không thể tính điểm'));
  }
}
