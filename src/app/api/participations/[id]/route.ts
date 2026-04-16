import { NextRequest } from 'next/server';
import { dbGet, dbRun } from '@/lib/database';
import { requireApiAuth } from '@/lib/guards';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

function toCanonicalApiError(error: any, fallbackMessage: string) {
  if (error instanceof ApiError) return error;
  if (error && typeof error.status === 'number' && typeof error.code === 'string') {
    return new ApiError(error.code, error.message || fallbackMessage, error.status, error.details);
  }
  return ApiError.internalError(error?.message || fallbackMessage);
}

/**
 * GET /api/participations/:id
 * Get participation details
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await requireApiAuth(request);

    const participationId = parseInt(id);

    const participation = await dbGet(
      `SELECT 
        p.*,
        u.name as student_name,
        a.title as activity_title,
        pc.total_points
       FROM participations p
       JOIN users u ON p.student_id = u.id
       JOIN activities a ON p.activity_id = a.id
       LEFT JOIN point_calculations pc ON p.id = pc.participation_id
       WHERE p.id = ?`,
      [participationId]
    );

    if (!participation) {
      return errorResponse(ApiError.notFound('Không tìm thấy lượt tham gia'));
    }

    return successResponse({ participation });
  } catch (error: any) {
    console.error('Lỗi khi tải lượt tham gia:', error);
    return errorResponse(toCanonicalApiError(error, 'Không thể tải lượt tham gia'));
  }
}

/**
 * PUT /api/participations/:id
 * Update participation (attendance status, etc.)
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await requireApiAuth(request);

    const participationId = parseInt(id);
    const body = await request.json();
    const { attendance_status } = body;

    if (!attendance_status) {
      return errorResponse(ApiError.validation('Thiếu attendance_status'));
    }

    const statusMap: Record<string, 'registered' | 'attended' | 'absent'> = {
      registered: 'registered',
      attended: 'attended',
      present: 'attended',
      late: 'attended',
      excused: 'absent',
      absent: 'absent',
    };

    const normalizedStatus = statusMap[String(attendance_status)];
    if (!normalizedStatus) {
      return errorResponse(ApiError.validation('attendance_status không hợp lệ'));
    }

    await dbRun(
      `UPDATE participations 
       SET attendance_status = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [normalizedStatus, participationId]
    );

    return successResponse(
      { attendance_status: normalizedStatus },
      'Cập nhật điểm danh thành công'
    );
  } catch (error: any) {
    console.error('Lỗi khi cập nhật lượt tham gia:', error);
    return errorResponse(toCanonicalApiError(error, 'Không thể cập nhật lượt tham gia'));
  }
}

/**
 * DELETE /api/participations/:id
 * Withdraw/Remove from activity (student unregister)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireApiAuth(request);

    const participationId = parseInt(id);

    const participation = await dbGet(
      `SELECT p.id, p.student_id, p.activity_id, a.title, a.date_time
       FROM participations p
       JOIN activities a ON p.activity_id = a.id
       WHERE p.id = ?`,
      [participationId]
    );

    if (!participation) {
      return errorResponse(ApiError.notFound('Không tìm thấy lượt tham gia'));
    }

    if (user.role === 'student' && user.id !== participation.student_id) {
      return errorResponse(
        ApiError.forbidden('Bạn chỉ có thể hủy đăng ký hoạt động của chính mình')
      );
    }

    const activityDateTime = new Date(participation.date_time);
    const now = new Date();
    if (activityDateTime < now && user.role === 'student') {
      return errorResponse(
        new ApiError('CONFLICT', 'Không thể hủy đăng ký hoạt động đã bắt đầu', 409)
      );
    }

    await dbRun('DELETE FROM point_calculations WHERE participation_id = ?', [participationId]);
    await dbRun('DELETE FROM participations WHERE id = ?', [participationId]);

    console.warn(
      `[AUDIT] ${user.role} ${user.id} removed/unregistered participation ${participationId} from activity "${participation.title}"`
    );

    const msgText =
      user.role === 'student'
        ? `Đã hủy đăng ký hoạt động "${participation.title}"`
        : `Đã xóa sinh viên khỏi hoạt động "${participation.title}"`;

    return successResponse(
      {
        participation_id: participationId,
        activity_id: participation.activity_id,
        activity_title: participation.title,
        student_id: participation.student_id,
        action: user.role === 'student' ? 'unregistered' : 'removed',
      },
      msgText
    );
  } catch (error: any) {
    console.error('Lỗi khi xóa lượt tham gia:', error);
    return errorResponse(toCanonicalApiError(error, 'Không thể xóa lượt tham gia'));
  }
}
