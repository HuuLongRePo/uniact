import { NextRequest } from 'next/server';
import { dbRun } from '@/lib/database';
import { requireApiRole } from '@/lib/guards';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await requireApiRole(request, ['admin']);

    const { id } = await context.params;
    const recordId = Number(id);
    if (!Number.isInteger(recordId) || recordId <= 0) {
      return errorResponse(ApiError.validation('Mã điểm danh không hợp lệ'));
    }

    const { status } = await request.json();

    if (!['present', 'absent', 'late'].includes(status)) {
      return errorResponse(ApiError.validation('Trạng thái điểm danh không hợp lệ'));
    }

    await dbRun('UPDATE attendance_records SET status = ? WHERE id = ?', [status, recordId]);

    return successResponse({ updated: true, id: recordId, status }, 'Cập nhật điểm danh thành công');
  } catch (error: any) {
    console.error('Update attendance error:', error);
    return errorResponse(
      error instanceof ApiError ||
        (error && typeof error.status === 'number' && typeof error.code === 'string')
        ? error
        : ApiError.internalError('Không thể cập nhật điểm danh', { details: error?.message })
    );
  }
}
