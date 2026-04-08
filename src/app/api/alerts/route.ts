import { NextRequest } from 'next/server';
import { getUserFromRequest } from '@/lib/guards';
import { dbAll, dbGet, dbRun } from '@/lib/database';
import { apiHandler, ApiError, successResponse } from '@/lib/api-response';

// GET /api/alerts?page=1&per_page=20&unread=1
export const GET = apiHandler(async (request: NextRequest) => {
  const user = await getUserFromRequest(request);
  if (!user) throw ApiError.unauthorized('Unauthorized');

  const params = request.nextUrl?.searchParams;
  const unreadOnly = params?.get('unread') === '1';
  const page = Math.max(Number(params?.get('page') || '1'), 1);
  const per_page = Math.min(Math.max(Number(params?.get('per_page') || '20'), 1), 100);
  const offset = (page - 1) * per_page;

  // build where clauses depending on role
  const whereClauses: string[] = [];
  const bindings: any[] = [];

  if (unreadOnly) {
    whereClauses.push('is_read = 0');
  }

  if (user.role === 'teacher') {
    // only show general alerts (not tied to activities) OR alerts tied to this teacher's activities
    // We'll use a subquery to include alerts for activities owned by this teacher
    whereClauses.push(
      "(related_table IS NULL OR related_table != 'activities' OR (related_table = 'activities' AND related_id IN (SELECT id FROM activities WHERE teacher_id = ?)))"
    );
    bindings.push(user.id);
  }

  const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const totalRow = (await dbGet(`SELECT COUNT(*) as total FROM alerts ${whereSQL}`, bindings)) as
    | { total?: number }
    | undefined;
  const total = totalRow?.total || 0;

  const unreadRow = (await dbGet(
    `SELECT COUNT(*) as unread FROM alerts ${whereSQL}${whereSQL ? ' AND' : 'WHERE'} is_read = 0`,
    bindings
  )) as { unread?: number } | undefined;
  const total_unread = unreadRow?.unread || 0;

  const alerts = await dbAll(
    `SELECT * FROM alerts ${whereSQL} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...bindings, per_page, offset]
  );

  return successResponse({ alerts, meta: { total, total_unread, page, per_page } });
});

// POST /api/alerts  body: { id } or { ids: [..] }
export const POST = apiHandler(async (request: NextRequest) => {
  const user = await getUserFromRequest(request);
  if (!user) throw ApiError.unauthorized('Unauthorized');

  const body = await request.json();
  const ids: number[] = [];
  if (Array.isArray(body?.ids)) {
    for (const v of body.ids) ids.push(Number(v));
  } else if (body?.id) {
    ids.push(Number(body.id));
  }
  if (ids.length === 0) throw ApiError.badRequest('Missing id(s)');

  // For security: ensure teacher cannot mark alerts that do not belong to them as read
  if (user.role === 'teacher') {
    // fetch alerts and ensure each is either general or belongs to their activities
    const placeholders = ids.map(() => '?').join(',');
    const alerts = await dbAll(`SELECT * FROM alerts WHERE id IN (${placeholders})`, ids);
    for (const a of alerts) {
      if (a.related_table === 'activities') {
        const activity = await dbGet('SELECT teacher_id FROM activities WHERE id = ?', [
          a.related_id,
        ]);
        if (!activity || Number(activity.teacher_id) !== Number(user.id)) {
          throw ApiError.forbidden('Forbidden');
        }
      }
    }
  }

  const placeholders = ids.map(() => '?').join(',');
  await dbRun(`UPDATE alerts SET is_read = 1 WHERE id IN (${placeholders})`, ids);
  return successResponse({ marked: ids.length });
});
