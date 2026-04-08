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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Chỉ admin mới được recalculate all
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    console.warn('🔄 Recalculating all scores...');
    const result = await PointCalculationService.recalculateAll();

    return NextResponse.json({
      success: true,
      data: result,
      message: `Recalculated ${result.success} participations successfully, ${result.failed} failed`,
    });
  } catch (error: any) {
    console.error('Error recalculating scores:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to recalculate scores' },
      { status: 500 }
    );
  }
}
