import { NextRequest } from 'next/server';
import { dbGet, dbRun } from '@/lib/database';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import { requireApiRole } from '@/lib/guards';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireApiRole(request, ['teacher']);
    const { id } = await params;
    const suggestionId = Number(id);

    if (!Number.isInteger(suggestionId) || suggestionId <= 0) {
      return errorResponse(ApiError.validation('Suggestion ID khong hop le'));
    }

    const suggestion = (await dbGet(
      'SELECT id, status, suggestion_by FROM award_suggestions WHERE id = ?',
      [suggestionId]
    )) as
      | { id: number; status: 'pending' | 'approved' | 'rejected'; suggestion_by: number | null }
      | undefined;

    if (!suggestion) {
      return errorResponse(ApiError.notFound('Khong tim thay de xuat'));
    }

    if (Number(suggestion.suggestion_by || 0) !== Number(user.id)) {
      return errorResponse(ApiError.forbidden('Ban chi duoc xoa de xuat do minh tao'));
    }

    if (suggestion.status !== 'pending') {
      return errorResponse(ApiError.conflict('Chi duoc xoa de xuat dang cho duyet'));
    }

    await dbRun('DELETE FROM award_suggestions WHERE id = ?', [suggestionId]);

    return successResponse({}, 'Xoa de xuat khen thuong thanh cong');
  } catch (error: any) {
    console.error('Teacher delete award suggestion error:', error);
    return errorResponse(
      error instanceof ApiError
        ? error
        : ApiError.internalError('Khong the xoa de xuat khen thuong', {
            details: error?.message,
          })
    );
  }
}
