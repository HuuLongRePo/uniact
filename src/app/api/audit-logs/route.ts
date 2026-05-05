import { NextRequest } from 'next/server';
import { getUserFromRequest } from '@/lib/guards';
import { dbAll, dbGet } from '@/lib/database';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

// GET /api/audit-logs?page=1&per_page=20&actor_id=&action=&date_from=&date_to=&export=csv
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return errorResponse(ApiError.unauthorized('Chưa đăng nhập'));

    const params = request.nextUrl?.searchParams;
    const page = Math.max(Number(params?.get('page') || '1'), 1);
    const per_page = Math.min(Math.max(Number(params?.get('per_page') || '20'), 1), 500);
    const offset = (page - 1) * per_page;
    const actor_id = params?.get('actor_id');
    const actionLike = params?.get('action');
    const target_table = params?.get('target_table');
    const target_id = params?.get('target_id');
    const date_from = params?.get('date_from');
    const date_to = params?.get('date_to');
    const exportCsv = params?.get('export') === 'csv';

    const whereClauses: string[] = [];
    const whereClausesAliased: string[] = [];
    const bindings: any[] = [];

    if (actor_id) {
      whereClauses.push('actor_id = ?');
      whereClausesAliased.push('l.actor_id = ?');
      bindings.push(Number(actor_id));
    }
    if (actionLike) {
      whereClauses.push('action LIKE ?');
      whereClausesAliased.push('l.action LIKE ?');
      bindings.push('%' + actionLike + '%');
    }
    if (target_table) {
      whereClauses.push('target_table = ?');
      whereClausesAliased.push('l.target_table = ?');
      bindings.push(target_table);
    }
    if (target_id) {
      whereClauses.push('target_id = ?');
      whereClausesAliased.push('l.target_id = ?');
      bindings.push(Number(target_id));
    }
    if (date_from) {
      whereClauses.push('created_at >= ?');
      whereClausesAliased.push('l.created_at >= ?');
      bindings.push(date_from);
    }
    if (date_to) {
      whereClauses.push('created_at <= ?');
      whereClausesAliased.push('l.created_at <= ?');
      bindings.push(date_to);
    }

    // Teachers can only see logs where they are actor or related to their activities
    if (user.role === 'teacher') {
      whereClauses.push(
        "(actor_id = ? OR (target_table = 'activities' AND target_id IN (SELECT id FROM activities WHERE teacher_id = ?)))"
      );
      whereClausesAliased.push(
        "(l.actor_id = ? OR (l.target_table = 'activities' AND l.target_id IN (SELECT id FROM activities WHERE teacher_id = ?)))"
      );
      bindings.push(user.id, user.id);
    }

    const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const whereSQLAliased =
      whereClausesAliased.length > 0 ? `WHERE ${whereClausesAliased.join(' AND ')}` : '';

    const totalRow = (await dbGet(
      `SELECT COUNT(*) as total FROM audit_logs ${whereSQL}`,
      bindings
    )) as { total?: number } | undefined;
    const total = totalRow?.total || 0;

    const logs = await dbAll(
      `SELECT
         l.*,
         u.name AS actor_name,
         u.email AS actor_email,
         u.role AS actor_role
       FROM audit_logs l
       LEFT JOIN users u ON u.id = l.actor_id
       ${whereSQLAliased}
       ORDER BY l.created_at DESC
       LIMIT ? OFFSET ?`,
      [...bindings, per_page, offset]
    );

    if (exportCsv) {
      // build CSV string
      const header = 'id,actor_id,action,target_table,target_id,details,created_at\n';
      const rows = (logs || [])
        .map((l: any) => {
          const safe = (v: any) => {
            if (v === null || v === undefined) return '';
            return String(v).replace(/"/g, '""');
          };
          return `${safe(l.id)},${safe(l.actor_id)},"${safe(l.action)}",${safe(l.target_table)},${safe(l.target_id)},"${safe(l.details)}",${safe(l.created_at)}`;
        })
        .join('\n');
      const csv = header + rows;
      // Return CSV as JSON field 'csv' for now (client can download)
      return successResponse({ csv, meta: { total, page, per_page } });
    }

    return successResponse({ logs, meta: { total, page, per_page } });
  } catch (error: any) {
    console.error('Get audit logs error:', error);
    return errorResponse(ApiError.internalError('Lỗi máy chủ nội bộ'));
  }
}
