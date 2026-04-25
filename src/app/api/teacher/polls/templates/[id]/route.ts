import { NextRequest } from 'next/server';
import { dbReady, dbRun } from '@/lib/database';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import { requireApiRole } from '@/lib/guards';
import { ensurePollSchema, parsePollId } from '@/lib/polls';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbReady();
    await ensurePollSchema();

    const user = await requireApiRole(request, ['teacher', 'admin']);
    const { id } = await params;
    const templateId = parsePollId(id);
    if (!templateId) {
      return errorResponse(ApiError.validation('ID mau poll khong hop le'));
    }

    const result =
      user.role === 'admin'
        ? await dbRun(`DELETE FROM poll_templates WHERE id = ?`, [templateId])
        : await dbRun(`DELETE FROM poll_templates WHERE id = ? AND created_by = ?`, [
            templateId,
            user.id,
          ]);

    if (!Number(result.changes || 0)) {
      return errorResponse(ApiError.notFound('Khong tim thay mau poll'));
    }

    return successResponse({}, 'Xoa mau poll thanh cong');
  } catch (error) {
    console.error('Teacher poll templates DELETE error:', error);
    return errorResponse(
      error instanceof ApiError ||
        (error && typeof (error as any).status === 'number' && typeof (error as any).code === 'string')
        ? (error as ApiError)
        : ApiError.internalError('Khong the xoa mau poll')
    );
  }
}
