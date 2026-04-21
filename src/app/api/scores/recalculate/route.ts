import { NextRequest, NextResponse } from 'next/server';
import { PointCalculationService } from '@/lib/scoring';
import { getUserFromSession } from '@/lib/auth';

/**
 * POST /api/scores/recalculate
 * Recalculate tất cả điểm
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromSession();
    if (!user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    // Chỉ admin mới được recalculate all
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Không có quyền truy cập (chỉ admin)' }, { status: 403 });
    }

    console.warn('🔄 Recalculating all scores...');
    const result = await PointCalculationService.recalculateAll();

    return NextResponse.json({
      success: true,
      data: result,
      message: `Đã tính lại điểm cho ${result.success} lượt tham gia, ${result.failed} lượt thất bại`,
    });
  } catch (error: any) {
    console.error('Error recalculating scores:', error);
    return NextResponse.json(
      { error: error.message || 'Không thể tính lại điểm' },
      { status: 500 }
    );
  }
}
