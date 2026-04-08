import { NextRequest } from 'next/server';
import { dbAll, dbGet } from '@/lib/database';
import { requireApiRole } from '@/lib/guards';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

/**
 * GET /api/qr-sessions/[id]/scans
 *
 * Returns deduplicated attendance scans for a QR session.
 * Access policy:
 * - Admin: can view all sessions
 * - Teacher: only sessions created by self
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiRole(request, ['teacher', 'admin']);

    const { id } = await params;
    const sessionId = Number(id);
    if (!Number.isFinite(sessionId)) {
      return errorResponse(ApiError.validation('ID phiên QR không hợp lệ'));
    }

    const session = (await dbGet(
      `SELECT id, activity_id, creator_id, created_at, expires_at, is_active
       FROM qr_sessions
       WHERE id = ?`,
      [sessionId]
    )) as
      | {
          id: number;
          activity_id: number;
          creator_id: number;
          created_at: string;
          expires_at: string;
          is_active: number;
        }
      | undefined;

    if (!session) return errorResponse(ApiError.notFound('Không tìm thấy phiên QR'));

    if (user.role === 'teacher' && session.creator_id !== user.id) {
      return errorResponse(ApiError.forbidden('Bạn chỉ có thể xem dữ liệu phiên QR do mình tạo'));
    }

    const rawScans = (await dbAll(
      `SELECT 
        ar.id as attendance_id,
        ar.student_id,
        COALESCE(u.full_name, u.name) as student_name,
        COALESCE(u.student_code, u.code, u.username, CAST(u.id AS TEXT)) as student_code,
        c.name as class_name,
        ar.recorded_at as scanned_at
      FROM attendance_records ar
      JOIN users u ON u.id = ar.student_id
      LEFT JOIN classes c ON c.id = u.class_id
      WHERE ar.qr_session_id = ?
        AND ar.recorded_at IS NOT NULL
        AND ar.status IN ('recorded', 'present')
      ORDER BY ar.recorded_at DESC, ar.id DESC
      LIMIT 500`,
      [sessionId]
    )) as Array<{
      attendance_id: number;
      student_id: number;
      student_name: string;
      student_code: string;
      class_name: string | null;
      scanned_at: string;
    }>;

    const uniqueByStudent = new Set<number>();
    const scans = rawScans
      .filter((scan) => {
        if (uniqueByStudent.has(scan.student_id)) return false;
        uniqueByStudent.add(scan.student_id);
        return true;
      })
      .map((scan) => ({
        attendance_id: scan.attendance_id,
        student_id: scan.student_id,
        student_code: scan.student_code,
        student_name: scan.student_name,
        class_name: scan.class_name || '',
        scanned_at: scan.scanned_at,
      }));

    return successResponse({
      session: {
        id: session.id,
        activity_id: session.activity_id,
        created_at: session.created_at,
        expires_at: session.expires_at,
        is_active: Boolean(session.is_active),
      },
      scans,
      total: scans.length,
    });
  } catch (error: any) {
    console.error('Get qr scans error:', error);
    return errorResponse(ApiError.internalError('Không thể tải dữ liệu quét'));
  }
}
