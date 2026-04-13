import { NextRequest, NextResponse } from 'next/server';
import { dbAll, dbGet, dbHelpers } from '@/lib/database';
import { requireApiRole } from '@/lib/guards';
import { ApiError, errorResponse } from '@/lib/api-response';
import { teacherCanAccessActivity } from '@/lib/activity-access';

/**
 * Helper function to escape CSV values properly
 * Handles commas, quotes, and newlines
 */
function toCsvValue(value: any): string {
  if (value === null || value === undefined) return '';
  const str = String(value).trim();
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * GET /api/qr-sessions/[id]/scans/export
 *
 * Returns CSV file (not JSON) for attendance export.
 * Error responses still follow JSON `errorResponse` contract.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // 1. AUTH GUARD: Verify user role and resource ownership
    const user = await requireApiRole(request, ['teacher', 'admin']);

    const { id } = await params;
    const sessionId = Number(id);
    if (!Number.isFinite(sessionId)) {
      return errorResponse(ApiError.validation('ID phiên QR không hợp lệ'));
    }

    // 2. FETCH SESSION WITH ACTIVITY CONTEXT
    const session = (await dbGet(
      `SELECT id, activity_id, creator_id FROM qr_sessions WHERE id = ?`,
      [sessionId]
    )) as
      | {
          id: number;
          activity_id: number;
          creator_id: number;
        }
      | undefined;

    if (!session) {
      return errorResponse(ApiError.notFound('Không tìm thấy phiên QR'));
    }

    // 3. PERMISSION CHECK: Teacher can access sessions from related activities
    if (
      user.role === 'teacher' &&
      !(await teacherCanAccessActivity(Number(user.id), Number(session.activity_id)))
    ) {
      return errorResponse(
        ApiError.forbidden('Bạn chỉ có thể xuất dữ liệu phiên QR do mình tạo')
      );
    }

    // 4. FETCH ATTENDANCE RECORDS WITH STUDENT & CLASS DATA
    const rawScans = (await dbAll(
      `SELECT 
        ar.id as attendance_id,
        ar.student_id,
        COALESCE(u.student_code, u.code, u.username, CAST(u.id AS TEXT)) as student_code,
        COALESCE(u.name, u.username, CAST(u.id AS TEXT)) as student_name,
        c.name as class_name,
        ar.recorded_at as scanned_at
      FROM attendance_records ar
      JOIN users u ON u.id = ar.student_id
      LEFT JOIN classes c ON c.id = u.class_id
      WHERE ar.qr_session_id = ?
        AND ar.recorded_at IS NOT NULL
        AND ar.status = 'recorded'
      ORDER BY ar.recorded_at DESC, ar.id DESC
      LIMIT 500`,
      [sessionId]
    )) as Array<{
      attendance_id: number;
      student_id: number;
      student_code: string;
      student_name: string;
      class_name: string | null;
      scanned_at: string;
    }>;

    // 5. DEDUPLICATION: Keep only the latest scan per student
    const uniqueByStudent = new Set<number>();
    const scans = rawScans
      .filter((scan) => {
        if (uniqueByStudent.has(scan.student_id)) return false;
        uniqueByStudent.add(scan.student_id);
        return true;
      })
      // 6. SORT BY CLASS NAME, THEN STUDENT NAME
      .sort((a, b) => {
        const classA = (a.class_name || '').toLowerCase();
        const classB = (b.class_name || '').toLowerCase();
        if (classA !== classB) return classA.localeCompare(classB, 'vi');
        const nameA = (a.student_name || '').toLowerCase();
        const nameB = (b.student_name || '').toLowerCase();
        return nameA.localeCompare(nameB, 'vi');
      });

    // 7. BUILD CSV WITH VIETNAMESE HEADERS
    const headers = ['Mã số sinh viên', 'Họ và tên', 'Lớp', 'Thời gian quét'];
    const rows = scans.map((s) =>
      [
        toCsvValue(s.student_code),
        toCsvValue(s.student_name),
        toCsvValue(s.class_name || ''),
        toCsvValue(s.scanned_at),
      ].join(',')
    );

    // 8. CONSTRUCT CSV CONTENT WITH UTF-8 BOM
    // The BOM (\ufeff) ensures Excel on Windows displays Vietnamese characters correctly
    const csvContent = '\ufeff' + [headers.join(','), ...rows].join('\n');

    // 9. AUDIT LOG: Record the export action
    const timestamp = new Date().toISOString();
    try {
      await dbHelpers.createAuditLog(
        user.id,
        'export_attendance_csv',
        'qr_sessions',
        sessionId,
        JSON.stringify({
          actor_id: user.id,
          actor_role: user.role,
          target_table: 'qr_sessions',
          target_id: sessionId,
          result: 'success',
          exported_at: timestamp,
          record_count: scans.length,
        })
      );
    } catch (auditErr) {
      // Log audit error but don't fail the export
      console.warn('Failed to create audit log:', auditErr);
    }

    // 10. RETURN CSV FILE WITH PROPER HEADERS
    const dateStr = timestamp.split('T')[0]; // YYYY-MM-DD format
    const filename = `diem-danh-${sessionId}-${dateStr}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('Export attendance records error:', error);
    return errorResponse(
      error instanceof ApiError ||
        (error && typeof error.status === 'number' && typeof error.code === 'string')
        ? error instanceof ApiError
          ? error
          : new ApiError(error.code, error.message || 'Không thể xuất dữ liệu điểm danh', error.status, error.details)
        : ApiError.internalError('Không thể xuất dữ liệu điểm danh')
    );
  }
}
