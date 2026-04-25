import { NextRequest } from 'next/server';
import { dbAll, dbGet, dbReady, dbRun } from '@/lib/database';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import { ensurePollSchema, parsePollId } from '@/lib/polls';
import { requireApiAuth } from '@/lib/guards';

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function checkStudentPollMembership(userId: number, classId: number | null): Promise<boolean> {
  if (!classId) return true;

  const membership = await dbGet(
    `
      SELECT id
      FROM class_members
      WHERE user_id = ? AND class_id = ?
      LIMIT 1
    `,
    [userId, classId]
  );

  return Boolean(membership);
}

async function canViewPoll(
  user: { id: number; role: string; class_id?: number | null },
  poll: { created_by: number; class_id: number | null }
): Promise<boolean> {
  if (user.role === 'admin') return true;
  if (user.role === 'teacher') return poll.created_by === user.id;

  if (poll.class_id === null) {
    return true;
  }

  if (user.class_id && Number(user.class_id) === Number(poll.class_id)) {
    return true;
  }

  return checkStudentPollMembership(user.id, poll.class_id);
}

// GET /api/polls/[id] - poll detail and aggregated result
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbReady();
    await ensurePollSchema();

    const user = await requireApiAuth(request);
    const { id } = await params;
    const pollId = parsePollId(id);
    if (!pollId) {
      return errorResponse(ApiError.validation('ID poll khong hop le'));
    }

    const poll = await dbGet(
      `
        SELECT
          p.*,
          c.name AS class_name,
          u.name AS creator_name
        FROM polls p
        LEFT JOIN classes c ON c.id = p.class_id
        LEFT JOIN users u ON u.id = p.created_by
        WHERE p.id = ?
      `,
      [pollId]
    );

    if (!poll) {
      return errorResponse(ApiError.notFound('Khong tim thay poll'));
    }

    const allowed = await canViewPoll(user, poll);
    if (!allowed) {
      return errorResponse(ApiError.forbidden('Khong co quyen truy cap poll nay'));
    }

    const options = await dbAll(
      `
        SELECT
          po.id,
          po.option_text,
          po.display_order,
          COUNT(pr.id) AS vote_count
        FROM poll_options po
        LEFT JOIN poll_responses pr ON pr.option_id = po.id
        WHERE po.poll_id = ?
        GROUP BY po.id
        ORDER BY po.display_order ASC, po.id ASC
      `,
      [pollId]
    );

    const userVotes = await dbAll(
      `
        SELECT option_id
        FROM poll_responses
        WHERE poll_id = ? AND user_id = ?
      `,
      [pollId, user.id]
    );

    const totalVotes = options.reduce((sum, option) => sum + toNumber((option as any).vote_count), 0);

    return successResponse({
      poll,
      options: options.map((option: any) => {
        const voteCount = toNumber(option.vote_count);
        return {
          ...option,
          vote_count: voteCount,
          percentage: totalVotes > 0 ? ((voteCount / totalVotes) * 100).toFixed(1) : '0.0',
        };
      }),
      total_votes: totalVotes,
      user_votes: userVotes.map((vote: any) => toNumber(vote.option_id)),
      has_voted: userVotes.length > 0,
    });
  } catch (error) {
    console.error('Poll detail error:', error);
    return errorResponse(
      error instanceof ApiError ||
        (error && typeof (error as any).status === 'number' && typeof (error as any).code === 'string')
        ? (error as ApiError)
        : ApiError.internalError('Khong the tai chi tiet poll')
    );
  }
}

// POST /api/polls/[id] - submit vote
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbReady();
    await ensurePollSchema();

    const user = await requireApiAuth(request);
    const { id } = await params;
    const pollId = parsePollId(id);
    if (!pollId) {
      return errorResponse(ApiError.validation('ID poll khong hop le'));
    }

    const body = await request.json();
    const optionIds = Array.isArray(body?.option_ids)
      ? body.option_ids
          .map((value: unknown) => Number.parseInt(String(value), 10))
          .filter((value: number) => Number.isFinite(value) && value > 0)
      : [];
    const responseText = body?.response_text ? String(body.response_text).trim() : '';

    if (optionIds.length === 0) {
      return errorResponse(ApiError.validation('Chua chon lua chon nao'));
    }

    const poll = await dbGet(`SELECT * FROM polls WHERE id = ?`, [pollId]);
    if (!poll) {
      return errorResponse(ApiError.notFound('Khong tim thay poll'));
    }

    if (poll.status !== 'active') {
      return errorResponse(ApiError.validation('Poll da dong'));
    }

    if (!poll.allow_multiple && optionIds.length > 1) {
      return errorResponse(ApiError.validation('Poll chi cho phep chon mot lua chon'));
    }

    if (user.role === 'student') {
      const inOwnClass = poll.class_id === null || Number(poll.class_id) === Number(user.class_id || 0);
      if (!inOwnClass) {
        const membership = await checkStudentPollMembership(user.id, poll.class_id);
        if (!membership) {
          return errorResponse(ApiError.forbidden('Ban khong thuoc lop cua poll nay'));
        }
      }
    }

    const existingVote = await dbGet(
      `
        SELECT id
        FROM poll_responses
        WHERE poll_id = ? AND user_id = ?
        LIMIT 1
      `,
      [pollId, user.id]
    );
    if (existingVote) {
      return errorResponse(ApiError.validation('Ban da binh chon poll nay'));
    }

    const placeholders = optionIds.map(() => '?').join(', ');
    const validOptions = await dbAll(
      `
        SELECT id
        FROM poll_options
        WHERE poll_id = ? AND id IN (${placeholders})
      `,
      [pollId, ...optionIds]
    );

    if (validOptions.length !== optionIds.length) {
      return errorResponse(ApiError.validation('Lua chon khong hop le'));
    }

    const now = new Date().toISOString();
    for (const optionId of optionIds) {
      await dbRun(
        `
          INSERT INTO poll_responses (poll_id, option_id, user_id, response_text, created_at)
          VALUES (?, ?, ?, ?, ?)
        `,
        [pollId, optionId, user.id, responseText || null, now]
      );
    }

    return successResponse({}, 'Ghi nhan binh chon thanh cong');
  } catch (error) {
    console.error('Poll vote error:', error);
    return errorResponse(
      error instanceof ApiError ||
        (error && typeof (error as any).status === 'number' && typeof (error as any).code === 'string')
        ? (error as ApiError)
        : ApiError.internalError('Khong the ghi nhan binh chon')
    );
  }
}

// DELETE /api/polls/[id]?action=close|delete - close or delete poll
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbReady();
    await ensurePollSchema();

    const user = await requireApiAuth(request);
    if (user.role !== 'teacher' && user.role !== 'admin') {
      return errorResponse(ApiError.forbidden('Khong co quyen thao tac poll'));
    }

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
    console.error('Poll delete/close error:', error);
    return errorResponse(
      error instanceof ApiError ||
        (error && typeof (error as any).status === 'number' && typeof (error as any).code === 'string')
        ? (error as ApiError)
        : ApiError.internalError('Khong the thao tac poll')
    );
  }
}
