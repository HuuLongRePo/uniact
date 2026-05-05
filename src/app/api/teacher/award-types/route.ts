import { NextRequest } from 'next/server';
import { dbHelpers } from '@/lib/database';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import { requireApiRole } from '@/lib/guards';

export async function GET(request: NextRequest) {
  try {
    await requireApiRole(request, ['teacher', 'admin']);

    const awardTypes = await dbHelpers.getAwardTypes();
    const normalized = (awardTypes || []).map((item: any) => ({
      id: Number(item.id),
      name: String(item.name || ''),
      description: item.description ? String(item.description) : '',
      min_points: Number(item.min_points || 0),
    }));

    return successResponse({ awardTypes: normalized });
  } catch (error: any) {
    console.error('Teacher get award types error:', error);
    return errorResponse(
      error instanceof ApiError
        ? error
        : ApiError.internalError('Khong the tai danh sach loai khen thuong', {
            details: error?.message,
          })
    );
  }
}
