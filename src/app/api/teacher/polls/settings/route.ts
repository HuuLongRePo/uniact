import { NextRequest } from 'next/server';
import { dbAll, dbGet, dbReady, dbRun } from '@/lib/database';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import { requireApiRole } from '@/lib/guards';
import { ensurePollSchema, parseTemplateOptions } from '@/lib/polls';

type PollSettingsRow = {
  id?: number;
  default_duration_minutes?: number;
  allow_multiple_answers?: number;
  show_results_before_closing?: number;
  allow_anonymous_responses?: number;
  default_visibility?: 'class' | 'student' | 'all' | string;
};

function toBoolean(value: unknown): boolean {
  return Number(value) > 0 || value === true;
}

function normalizeVisibility(value: unknown): 'class' | 'student' | 'all' {
  const visibility = String(value || '').trim();
  if (visibility === 'student' || visibility === 'all') {
    return visibility;
  }
  return 'class';
}

function mapSettings(row: PollSettingsRow | null | undefined, templates: any[]) {
  return {
    id: Number(row?.id || 1),
    default_duration_minutes: Math.max(1, Number(row?.default_duration_minutes || 60)),
    allow_multiple_answers: toBoolean(row?.allow_multiple_answers),
    show_results_before_closing: toBoolean(
      row?.show_results_before_closing === undefined ? 1 : row?.show_results_before_closing
    ),
    allow_anonymous_responses: toBoolean(row?.allow_anonymous_responses),
    default_visibility: normalizeVisibility(row?.default_visibility),
    templates,
  };
}

async function loadTemplatesForUser(userId: number) {
  const rows = await dbAll(
    `
      SELECT *
      FROM poll_templates
      WHERE created_by = ?
      ORDER BY datetime(created_at) DESC, id DESC
    `,
    [userId]
  );

  return rows.map((row: any) => ({
    id: Number(row.id),
    name: String(row.name || ''),
    category: String(row.category || 'general'),
    poll_type: String(row.poll_type || 'single_choice'),
    default_options: parseTemplateOptions(row.default_options),
    description: String(row.description || ''),
    created_at: String(row.created_at || ''),
  }));
}

export async function GET(request: NextRequest) {
  try {
    await dbReady();
    await ensurePollSchema();

    const user = await requireApiRole(request, ['teacher', 'admin']);
    const row = (await dbGet(
      `
        SELECT *
        FROM poll_settings
        WHERE user_id = ?
      `,
      [user.id]
    )) as PollSettingsRow | undefined;

    const templates = await loadTemplatesForUser(user.id);
    return successResponse({
      settings: mapSettings(row, templates),
    });
  } catch (error) {
    console.error('Teacher poll settings GET error:', error);
    return errorResponse(
      error instanceof ApiError ||
        (error && typeof (error as any).status === 'number' && typeof (error as any).code === 'string')
        ? (error as ApiError)
        : ApiError.internalError('Khong the tai cau hinh poll')
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbReady();
    await ensurePollSchema();

    const user = await requireApiRole(request, ['teacher', 'admin']);
    const body = await request.json();

    const duration = Number.parseInt(String(body?.default_duration_minutes ?? 60), 10);
    if (!Number.isFinite(duration) || duration < 1 || duration > 1440) {
      return errorResponse(ApiError.validation('default_duration_minutes phai trong khoang 1-1440'));
    }

    const visibility = normalizeVisibility(body?.default_visibility);
    if (
      body?.default_visibility !== undefined &&
      !['class', 'student', 'all'].includes(String(body.default_visibility))
    ) {
      return errorResponse(ApiError.validation('default_visibility khong hop le'));
    }

    await dbRun(
      `
        INSERT INTO poll_settings (
          user_id,
          default_duration_minutes,
          allow_multiple_answers,
          show_results_before_closing,
          allow_anonymous_responses,
          default_visibility,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        ON CONFLICT(user_id) DO UPDATE SET
          default_duration_minutes = excluded.default_duration_minutes,
          allow_multiple_answers = excluded.allow_multiple_answers,
          show_results_before_closing = excluded.show_results_before_closing,
          allow_anonymous_responses = excluded.allow_anonymous_responses,
          default_visibility = excluded.default_visibility,
          updated_at = datetime('now')
      `,
      [
        user.id,
        duration,
        body?.allow_multiple_answers ? 1 : 0,
        body?.show_results_before_closing === false ? 0 : 1,
        body?.allow_anonymous_responses ? 1 : 0,
        visibility,
      ]
    );

    const row = (await dbGet(
      `
        SELECT *
        FROM poll_settings
        WHERE user_id = ?
      `,
      [user.id]
    )) as PollSettingsRow | undefined;
    const templates = await loadTemplatesForUser(user.id);

    return successResponse(
      {
        settings: mapSettings(row, templates),
      },
      'Luu cau hinh poll thanh cong'
    );
  } catch (error) {
    console.error('Teacher poll settings POST error:', error);
    return errorResponse(
      error instanceof ApiError ||
        (error && typeof (error as any).status === 'number' && typeof (error as any).code === 'string')
        ? (error as ApiError)
        : ApiError.internalError('Khong the luu cau hinh poll')
    );
  }
}
