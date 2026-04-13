import { NextRequest } from 'next/server';
import { dbAll } from '@/lib/database';
import { requireApiRole } from '@/lib/guards';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    await requireApiRole(request, ['admin']);

    const records = await dbAll(`
      SELECT
        ar.id,
        ar.activity_id as activityId,
        act.title as activityName,
        act.date_time as activityDate,
        ar.student_id as userId,
        u.name as userName,
        u.email as userEmail,
        CASE
          WHEN ar.status = 'void' THEN 'absent'
          ELSE 'present'
        END as status,
        0 as pointsAwarded
      FROM attendance_records ar
      JOIN activities act ON ar.activity_id = act.id
      JOIN users u ON ar.student_id = u.id
      ORDER BY act.date_time DESC, u.name ASC
    `);

    return successResponse({ records });
  } catch (error: any) {
    console.error('Get attendance error:', error);
    return errorResponse(
      error instanceof ApiError ||
        (error && typeof error.status === 'number' && typeof error.code === 'string')
        ? error
        : ApiError.internalError('Không thể tải danh sách điểm danh', { details: error?.message })
    );
  }
}
