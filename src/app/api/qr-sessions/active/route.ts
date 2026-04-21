import { NextRequest } from 'next/server';
import { dbGet } from '@/lib/database';
import { requireApiRole } from '@/lib/guards';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import { teacherCanAccessActivity } from '@/lib/activity-access';
import { User } from '@/types/database';

type SessionOptions = {
  single_use: boolean;
  max_scans: number | null;
};

function parseStoredSessionOptions(rawMetadata: unknown): SessionOptions {
  if (!rawMetadata || typeof rawMetadata !== 'string') {
    return { single_use: false, max_scans: null };
  }

  try {
    const parsed = JSON.parse(rawMetadata);
    return {
      single_use: Boolean(parsed?.single_use),
      max_scans:
        typeof parsed?.max_scans === 'number' && Number.isFinite(parsed.max_scans)
          ? parsed.max_scans
          : null,
    };
  } catch {
    return { single_use: false, max_scans: null };
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireApiRole(request, ['teacher', 'admin']);
    const { searchParams } = new URL(request.url);
    const activityId = Number(searchParams.get('activity_id'));

    if (!Number.isFinite(activityId) || activityId <= 0) {
      return errorResponse(ApiError.validation('activity_id khong hop le'));
    }

    const activity = (await dbGet(
      `SELECT id
       FROM activities
       WHERE id = ?`,
      [activityId]
    )) as { id: number } | undefined;

    if (!activity) {
      return errorResponse(ApiError.notFound('Khong tim thay hoat dong'));
    }

    if (
      (user as User).role === 'teacher' &&
      !(await teacherCanAccessActivity(Number((user as User).id), activityId))
    ) {
      return errorResponse(ApiError.forbidden('Ban khong co quyen xem phien QR cua hoat dong nay'));
    }

    const activeSession = (await dbGet(
      `SELECT id, session_token, expires_at, metadata
       FROM qr_sessions
       WHERE activity_id = ?
         AND is_active = 1
         AND datetime(COALESCE(expires_at, datetime('now', '-1 second'))) > datetime('now')
       ORDER BY created_at DESC
       LIMIT 1`,
      [activityId]
    )) as
      | { id: number; session_token: string; expires_at: string; metadata: string | null }
      | undefined;

    if (!activeSession) {
      return successResponse({ session: null });
    }

    return successResponse({
      session: {
        id: activeSession.id,
        token: activeSession.session_token,
        session_id: activeSession.id,
        session_token: activeSession.session_token,
        expires_at: activeSession.expires_at,
        options: parseStoredSessionOptions(activeSession.metadata),
        reusable: true,
      },
    });
  } catch (error: any) {
    console.error('Active QR session fetch error:', error);
    return errorResponse(ApiError.internalError('Khong the tai phien QR dang hoat dong'));
  }
}
