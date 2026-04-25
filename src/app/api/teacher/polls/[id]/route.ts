import { NextRequest } from 'next/server';
import { dbGet, dbReady, dbRun } from '@/lib/database';
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
    const pollId = parsePollId(id);
    if (!pollId) {
      return errorResponse(ApiError.validation('ID poll khong hop le'));
    }

    const poll = await dbGet(`SELECT * FROM polls WHERE id = ?`, [pollId]);
    if (!poll) {
      return errorResponse(ApiError.notFound('Khong tim thay poll'));
    }

    const isOwner = Number(poll.created_by) === Number(user.id);
    if (user.role !== 'admin' && !isOwner) {
      return errorResponse(ApiError.forbidden('Khong co quyen thao tac poll nay'));
    }

    const action = new URL(request.url).searchParams.get('action');
    if (action === 'close') {
      await dbRun(
        `
          UPDATE polls
          SET status = 'closed', closed_at = ?
          WHERE id = ?
        `,
        [new Date().toISOString(), pollId]
      );
      return successResponse({}, 'Da dong poll');
    }

    await dbRun(`DELETE FROM polls WHERE id = ?`, [pollId]);
    return successResponse({}, 'Da xoa poll');
  } catch (error) {
    console.error('Teacher poll delete/close error:', error);
    return errorResponse(
      error instanceof ApiError ||
        (error && typeof (error as any).status === 'number' && typeof (error as any).code === 'string')
        ? (error as ApiError)
        : ApiError.internalError('Khong the thao tac poll')
    );
  }
}
