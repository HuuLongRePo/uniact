import { NextRequest } from 'next/server';
import { dbAll, dbGet, dbReady } from '@/lib/database';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import { ensurePollSchema, parsePollId } from '@/lib/polls';
import { requireApiRole } from '@/lib/guards';

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
      return errorResponse(ApiError.forbidden('Khong co quyen xem phan hoi poll nay'));
    }

    const responses = await dbAll(
      `
        SELECT
          pr.id,
          pr.poll_id,
          p.title AS poll_title,
          u.id AS student_id,
          u.name AS student_name,
          COALESCE(c.name, '') AS class_name,
          po.option_text AS selected_option,
          COALESCE(pr.response_text, '') AS response_text,
          pr.created_at AS responded_at
        FROM poll_responses pr
        INNER JOIN polls p ON p.id = pr.poll_id
        INNER JOIN poll_options po ON po.id = pr.option_id
        INNER JOIN users u ON u.id = pr.user_id
        LEFT JOIN classes c ON c.id = u.class_id
        WHERE pr.poll_id = ?
        ORDER BY datetime(pr.created_at) DESC, pr.id DESC
      `,
      [pollId]
    );

    const optionRows = await dbAll(
      `
        SELECT
          po.id,
          po.poll_id,
          po.option_text,
          COUNT(pr.id) AS response_count
        FROM poll_options po
        LEFT JOIN poll_responses pr ON pr.option_id = po.id
        WHERE po.poll_id = ?
        GROUP BY po.id
        ORDER BY po.display_order ASC, po.id ASC
      `,
      [pollId]
    );

    const totalResponses = optionRows.reduce(
      (sum, option) => sum + toNumber((option as any).response_count),
      0
    );

    const options = optionRows.map((option: any) => {
      const responseCount = toNumber(option.response_count);
      return {
        ...option,
        response_count: responseCount,
        percentage: totalResponses > 0 ? Number(((responseCount / totalResponses) * 100).toFixed(1)) : 0,
      };
    });

    return successResponse({
      poll,
      responses,
      options,
      total_responses: totalResponses,
    });
  } catch (error) {
    console.error('Teacher poll responses error:', error);
    return errorResponse(
      error instanceof ApiError ||
        (error && typeof (error as any).status === 'number' && typeof (error as any).code === 'string')
        ? (error as ApiError)
        : ApiError.internalError('Khong the tai phan hoi poll')
    );
  }
}
