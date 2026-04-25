import { NextRequest, NextResponse } from 'next/server';
import { dbAll, dbGet, dbReady } from '@/lib/database';
import { ApiError, errorResponse } from '@/lib/api-response';
import { requireApiRole } from '@/lib/guards';
import { csvCell, ensurePollSchema, parsePollId } from '@/lib/polls';
import { formatVietnamDateTime, toVietnamDateStamp } from '@/lib/timezone';
import { buildAttachmentContentDisposition } from '@/lib/content-disposition';

function buildWhereClause(filters: any) {
  const clauses: string[] = [];
  const params: any[] = [];

  if (filters?.classId) {
    clauses.push('c.name = ?');
    params.push(String(filters.classId));
  }

  if (filters?.dateStart) {
    clauses.push(`datetime(pr.created_at) >= datetime(?)`);
    params.push(`${String(filters.dateStart)}T00:00:00`);
  }

  if (filters?.dateEnd) {
    clauses.push(`datetime(pr.created_at) <= datetime(?)`);
    params.push(`${String(filters.dateEnd)}T23:59:59`);
  }

  return {
    sql: clauses.length > 0 ? `AND ${clauses.join(' AND ')}` : '',
    params,
  };
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
      return errorResponse(ApiError.forbidden('Khong co quyen xuat phan hoi poll nay'));
    }

    const body = await request.json().catch(() => ({}));
    const filters = body?.filters || {};
    const where = buildWhereClause(filters);

    const responses = await dbAll(
      `
        SELECT
          pr.id,
          u.name AS student_name,
          COALESCE(c.name, '') AS class_name,
          po.option_text AS selected_option,
          COALESCE(pr.response_text, '') AS response_text,
          pr.created_at AS responded_at
        FROM poll_responses pr
        INNER JOIN poll_options po ON po.id = pr.option_id
        INNER JOIN users u ON u.id = pr.user_id
        LEFT JOIN classes c ON c.id = u.class_id
        WHERE pr.poll_id = ?
        ${where.sql}
        ORDER BY datetime(pr.created_at) DESC, pr.id DESC
      `,
      [pollId, ...where.params]
    );

    const csvRows = [
      [
        csvCell('Hoc vien'),
        csvCell('Lop'),
        csvCell('Lua chon'),
        csvCell('Ghi chu'),
        csvCell('Thoi gian phan hoi'),
      ].join(','),
      ...responses.map((row: any) =>
        [
          csvCell(row.student_name),
          csvCell(row.class_name),
          csvCell(row.selected_option),
          csvCell(row.response_text),
          csvCell(formatVietnamDateTime(row.responded_at)),
        ].join(',')
      ),
    ];

    const filename = `poll-responses-${pollId}-${toVietnamDateStamp(new Date())}.csv`;
    const content = `\uFEFF${csvRows.join('\n')}`;

    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': buildAttachmentContentDisposition(filename),
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Teacher poll export responses error:', error);
    return errorResponse(
      error instanceof ApiError ||
        (error && typeof (error as any).status === 'number' && typeof (error as any).code === 'string')
        ? (error as ApiError)
        : ApiError.internalError('Khong the xuat phan hoi poll')
    );
  }
}
