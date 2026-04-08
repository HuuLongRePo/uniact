import { NextRequest } from 'next/server';
import { dbAll, dbGet } from '@/lib/database';
import { requireRole } from '@/lib/guards';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

type AuthorizedUser = {
  id: number;
  role: 'teacher' | 'admin' | string;
};

type ActivityOwnershipRow = {
  id: number;
  teacher_id: number;
};

type QrSessionRow = {
  id: number;
  session_token: string;
  created_at: string;
  expires_at: string | null;
  is_active: number | boolean;
  attendance_count: number;
};

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    let user: AuthorizedUser;
    try {
      user = (await requireRole(request, ['teacher', 'admin'])) as AuthorizedUser;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      return errorResponse(
        message.includes('Chưa đăng nhập')
          ? ApiError.unauthorized('Chưa đăng nhập')
          : ApiError.forbidden('Không có quyền truy cập')
      );
    }

    const { id } = await params;
    const activityId = Number(id);
    if (!Number.isFinite(activityId)) {
      return errorResponse(ApiError.validation('ID hoạt động không hợp lệ'));
    }

    const activity = (await dbGet('SELECT id, teacher_id FROM activities WHERE id = ?', [
      activityId,
    ])) as ActivityOwnershipRow | undefined;

    if (!activity) {
      return errorResponse(ApiError.notFound('Không tìm thấy hoạt động'));
    }

    if (user.role === 'teacher' && activity.teacher_id !== user.id) {
      return errorResponse(ApiError.forbidden('Bạn chỉ có thể xem hoạt động của mình'));
    }

    const rawSessions = (await dbAll(
      `SELECT 
        qs.id,
        qs.session_token,
        qs.created_at,
        qs.expires_at,
        qs.is_active,
        COUNT(ar.id) as attendance_count
      FROM qr_sessions qs
      LEFT JOIN attendance_records ar
        ON ar.qr_session_id = qs.id
       AND ar.status = 'recorded'
      WHERE qs.activity_id = ?
      GROUP BY qs.id, qs.session_token, qs.created_at, qs.expires_at, qs.is_active
      ORDER BY qs.created_at DESC
      LIMIT 100`,
      [activityId]
    )) as QrSessionRow[];

    const now = Date.now();
    const sessions = rawSessions.map((session) => {
      const start = new Date(session.created_at).getTime();
      const end = session.expires_at ? new Date(session.expires_at).getTime() : Number.NaN;
      const isExpired = Number.isFinite(end) ? end <= now : false;
      const isActive = Boolean(session.is_active) && !isExpired;
      const durationMinutes =
        Number.isFinite(end) && Number.isFinite(start)
          ? Math.max(0, Math.round((end - start) / 60000))
          : null;

      return {
        id: session.id,
        session_code: session.session_token,
        date_time: session.created_at,
        end_time: isActive ? null : session.expires_at,
        status: isActive ? 'active' : 'ended',
        attendance_count: Number(session.attendance_count || 0),
        duration_minutes: durationMinutes,
      };
    });

    return successResponse({ sessions });
  } catch (error: unknown) {
    console.error('Get activity qr sessions error:', error);
    return errorResponse(
      ApiError.internalError(
        'Không thể tải lịch sử phiên QR',
        error instanceof Error ? error.message : 'Unknown error'
      )
    );
  }
}
