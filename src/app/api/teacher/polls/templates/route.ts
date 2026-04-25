import { NextRequest } from 'next/server';
import { dbAll, dbReady, dbRun } from '@/lib/database';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import { requireApiRole } from '@/lib/guards';
import { ensurePollSchema, parseTemplateOptions } from '@/lib/polls';

const VALID_POLL_TYPES = new Set(['single_choice', 'multiple_choice', 'rating']);

function sanitizeTemplatePayload(payload: any) {
  const name = String(payload?.name || '').trim();
  const category = String(payload?.category || 'general').trim() || 'general';
  const pollType = String(payload?.poll_type || 'single_choice').trim() || 'single_choice';
  const description = String(payload?.description || '').trim();
  const defaultOptions = parseTemplateOptions(payload?.default_options || []);

  return {
    name,
    category,
    pollType,
    description,
    defaultOptions,
  };
}

function mapTemplateRow(row: any) {
  return {
    id: Number(row.id),
    name: String(row.name || ''),
    category: String(row.category || 'general'),
    poll_type: String(row.poll_type || 'single_choice'),
    default_options: parseTemplateOptions(row.default_options),
    description: String(row.description || ''),
    created_at: String(row.created_at || ''),
  };
}

export async function GET(request: NextRequest) {
  try {
    await dbReady();
    await ensurePollSchema();

    const user = await requireApiRole(request, ['teacher', 'admin']);
    const rows = await dbAll(
      `
        SELECT *
        FROM poll_templates
        WHERE created_by = ?
        ORDER BY datetime(created_at) DESC, id DESC
      `,
      [user.id]
    );

    return successResponse({
      templates: rows.map(mapTemplateRow),
    });
  } catch (error) {
    console.error('Teacher poll templates GET error:', error);
    return errorResponse(
      error instanceof ApiError ||
        (error && typeof (error as any).status === 'number' && typeof (error as any).code === 'string')
        ? (error as ApiError)
        : ApiError.internalError('Khong the tai danh sach mau poll')
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbReady();
    await ensurePollSchema();

    const user = await requireApiRole(request, ['teacher', 'admin']);
    const body = await request.json();
    const payload = sanitizeTemplatePayload(body);

    if (!payload.name) {
      return errorResponse(ApiError.validation('Ten mau poll la bat buoc'));
    }

    if (!VALID_POLL_TYPES.has(payload.pollType)) {
      return errorResponse(ApiError.validation('poll_type khong hop le'));
    }

    if (payload.defaultOptions.length < 2) {
      return errorResponse(ApiError.validation('Can it nhat 2 tuy chon mac dinh'));
    }

    const result = await dbRun(
      `
        INSERT INTO poll_templates (
          created_by,
          name,
          category,
          poll_type,
          description,
          default_options,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `,
      [
        user.id,
        payload.name,
        payload.category,
        payload.pollType,
        payload.description,
        JSON.stringify(payload.defaultOptions),
      ]
    );

    const templateId = Number(result.lastID || 0);
    if (!templateId) {
      return errorResponse(ApiError.internalError('Khong the tao mau poll'));
    }

    const rows = await dbAll(`SELECT * FROM poll_templates WHERE id = ?`, [templateId]);
    const template = rows.length > 0 ? mapTemplateRow(rows[0]) : null;

    return successResponse({ template }, 'Tao mau poll thanh cong', 201);
  } catch (error) {
    console.error('Teacher poll templates POST error:', error);
    return errorResponse(
      error instanceof ApiError ||
        (error && typeof (error as any).status === 'number' && typeof (error as any).code === 'string')
        ? (error as ApiError)
        : ApiError.internalError('Khong the tao mau poll')
    );
  }
}
