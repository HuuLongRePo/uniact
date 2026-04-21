import { NextRequest } from 'next/server';
import { dbHelpers, dbAll, dbGet } from '@/lib/database';
import { requireApiRole } from '@/lib/guards';
import { rateLimit } from '@/lib/rateLimit';
import { User } from '@/types/database';
import crypto from 'crypto';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import { teacherCanAccessActivity } from '@/lib/activity-access';
import { sendBulkDatabaseNotifications } from '@/lib/notifications';

const MIN_EXPIRES_MINUTES = 1;
const MAX_EXPIRES_MINUTES = 60;
const DEFAULT_EXPIRES_MINUTES = 5;
const MAX_ALLOWED_SCANS = 5000;

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

function parseSessionOptions(body: any): {
  expiresMinutes: number;
  metadata: SessionOptions;
} {
  const requestedExpires = Number(body?.expires_minutes);
  const expiresMinutes = Number.isFinite(requestedExpires)
    ? Math.floor(requestedExpires)
    : DEFAULT_EXPIRES_MINUTES;

  if (expiresMinutes < MIN_EXPIRES_MINUTES || expiresMinutes > MAX_EXPIRES_MINUTES) {
    throw ApiError.validation(
      `expires_minutes phải trong khoảng ${MIN_EXPIRES_MINUTES}-${MAX_EXPIRES_MINUTES}`
    );
  }

  const singleUse = Boolean(body?.single_use);
  let maxScans: number | null = null;

  if (body?.max_scans !== undefined && body?.max_scans !== null) {
    const parsedMaxScans = Number(body.max_scans);
    if (!Number.isFinite(parsedMaxScans)) {
      throw ApiError.validation('max_scans không hợp lệ');
    }

    maxScans = Math.floor(parsedMaxScans);
    if (maxScans <= 0 || maxScans > MAX_ALLOWED_SCANS) {
      throw ApiError.validation(`max_scans phải trong khoảng 1-${MAX_ALLOWED_SCANS}`);
    }
  }

  if (singleUse) {
    maxScans = 1;
  }

  return {
    expiresMinutes,
    metadata: {
      single_use: singleUse,
      max_scans: maxScans,
    },
  };
}

// POST /api/qr-sessions
// body: { activity_id: number, expires_minutes?: number }
export async function POST(request: NextRequest) {
  try {
    // SECURITY: Rate limit QR session creation (20 per minute per IP)
    const rl = rateLimit(request, 20, 60 * 1000);
    if (!rl.allowed) {
      return errorResponse(new ApiError('RATE_LIMITED', 'Too many QR session requests', 429));
    }

    const body = await request.json();
    const { activity_id } = body;

    if (!activity_id) {
      return errorResponse(ApiError.validation('activity_id is required'));
    }

    // Auth + RBAC: require teacher OR admin
    const user = await requireApiRole(request, ['teacher', 'admin']);

    const activityId = Number(activity_id);
    if (!Number.isFinite(activityId)) {
      return errorResponse(ApiError.validation('activity_id không hợp lệ'));
    }

    const activity = (await dbGet(
      `SELECT id, teacher_id, title, status, approval_status
       FROM activities
       WHERE id = ?`,
      [activityId]
    )) as
      | { id: number; teacher_id: number; title: string; status: string; approval_status: string }
      | undefined;

    if (!activity) {
      return errorResponse(ApiError.notFound('Không tìm thấy hoạt động'));
    }

    if (
      (user as User).role === 'teacher' &&
      !(await teacherCanAccessActivity(Number((user as User).id), activityId))
    ) {
      return errorResponse(
        ApiError.forbidden('Bạn chỉ có thể tạo phiên QR cho hoạt động của mình')
      );
    }

    if (activity.approval_status !== 'approved' || activity.status !== 'published') {
      return errorResponse(
        ApiError.validation(
          'Chỉ có thể tạo phiên QR cho hoạt động đã được phê duyệt và đang published'
        )
      );
    }

    const existingActiveSession = (await dbGet(
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

    if (existingActiveSession) {
      return successResponse(
        {
          id: existingActiveSession.id,
          token: existingActiveSession.session_token,
          session_id: existingActiveSession.id,
          session_token: existingActiveSession.session_token,
          expires_at: existingActiveSession.expires_at,
          options: parseStoredSessionOptions(existingActiveSession.metadata),
          reused: true,
        },
        'Da co phien QR con hieu luc, su dung lai phien hien tai'
      );
    }

    const { expiresMinutes, metadata } = parseSessionOptions(body);

    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + expiresMinutes * 60 * 1000).toISOString();

    const result = await dbHelpers.createQRSession(
      activityId,
      (user as User).id,
      token,
      expiresAt,
      JSON.stringify(metadata)
    );

    try {
      const participantRows = (await dbAll(
        `SELECT DISTINCT student_id, COALESCE(participation_source, 'voluntary') as participation_source
         FROM participations
         WHERE activity_id = ?
           AND student_id IS NOT NULL
           AND attendance_status IN ('registered', 'attended')`,
        [activityId]
      )) as Array<{ student_id: number; participation_source?: string | null }>;

      const mandatoryIds = participantRows
        .filter((row) => String(row.participation_source || 'voluntary') === 'assigned')
        .map((row) => Number(row.student_id))
        .filter((value) => Number.isInteger(value) && value > 0);

      const voluntaryRegisteredIds = participantRows
        .filter((row) => String(row.participation_source || 'voluntary') !== 'assigned')
        .map((row) => Number(row.student_id))
        .filter((value) => Number.isInteger(value) && value > 0);

      const targetUserIds = Array.from(new Set([...mandatoryIds, ...voluntaryRegisteredIds]));

      if (targetUserIds.length > 0) {
        await sendBulkDatabaseNotifications({
          userIds: targetUserIds,
          type: 'attendance',
          title: 'Bat dau diem danh',
          message: `Hoat dong "${activity.title}" da mo phien QR diem danh. Vao ngay de quet QR.`,
          relatedTable: 'activities',
          relatedId: activityId,
          eventType: 'attendance_qr_started',
          actorId: Number((user as User).id),
          priority: 'high',
          ttlSeconds: 10,
          actionButtons: [
            {
              id: 'open_checkin',
              label: 'Quet QR ngay',
              action: 'open_link',
              href: `/student/check-in?activityId=${activityId}`,
              variant: 'primary',
            },
          ],
          metadata: {
            activity_id: activityId,
            qr_session_id: Number(result.lastID || 0),
            mandatory_count: mandatoryIds.length,
            voluntary_registered_count: voluntaryRegisteredIds.length,
          },
        });
      }
    } catch (notificationError) {
      console.error('QR start notification error:', notificationError);
    }

    return successResponse(
      {
        id: result.lastID || null,
        token,
        session_id: result.lastID || null,
        session_token: token,
        expires_at: expiresAt,
        options: metadata,
      },
      undefined,
      201
    );
  } catch (error: any) {
    console.error('QR session creation error:', error);
    return errorResponse(ApiError.internalError('Lỗi máy chủ nội bộ'));
  }
}

// GET /api/qr-sessions - Retrieve QR session history
export async function GET(request: NextRequest) {
  try {
    // Auth: require teacher OR admin
    const user = await requireApiRole(request, ['teacher', 'admin']);

    // For teachers, include sessions from activities they can operate on.
    const teacherId = (user as User).id;
    const isAdmin = (user as User).role === 'admin';

    const sessions = await dbAll(
      `
      SELECT 
        qs.id,
        qs.activity_id,
        qs.session_token,
        qs.created_at,
        qs.expires_at,
        qs.is_active,
        qs.metadata,
        a.title as activity_title,
        a.date_time as activity_date,
        COUNT(ar.id) as attendance_count
      FROM qr_sessions qs
      JOIN activities a ON qs.activity_id = a.id
      LEFT JOIN attendance_records ar ON qs.id = ar.qr_session_id
      WHERE ${
        isAdmin
          ? '1=1'
          : `(
              a.teacher_id = ?
              OR EXISTS (
                SELECT 1
                FROM activity_classes ac
                JOIN classes c ON c.id = ac.class_id
                LEFT JOIN class_teachers ct ON ct.class_id = c.id
                WHERE ac.activity_id = a.id
                  AND (c.teacher_id = ? OR ct.teacher_id = ?)
              )
            )`
      }
      GROUP BY qs.id
      ORDER BY qs.created_at DESC
      LIMIT 50
    `,
      isAdmin ? [] : [teacherId, teacherId, teacherId]
    );

    const sessionsWithParsedMetadata = (sessions || []).map((s: any) => ({
      ...s,
      status: s.is_active && new Date(s.expires_at).getTime() > Date.now() ? 'active' : 'ended',
      metadata: s.metadata
        ? (() => {
            try {
              return JSON.parse(s.metadata);
            } catch {
              return { single_use: false, max_scans: null };
            }
          })()
        : { single_use: false, max_scans: null },
    }));

    return successResponse({ sessions: sessionsWithParsedMetadata });
  } catch (error: any) {
    console.error('QR session history error:', error);
    return errorResponse(ApiError.internalError('Lỗi máy chủ nội bộ'));
  }
}
