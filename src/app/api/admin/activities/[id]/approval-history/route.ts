import { NextRequest } from 'next/server';
import { requireApiRole } from '@/lib/guards';
import { dbAll } from '@/lib/database';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireApiRole(request, ['admin']);

    const { id } = await params;
    const activityId = id;

    const history = await dbAll(
      `
      SELECT 
        h.id,
        h.status,
        h.notes,
        h.changed_by,
        COALESCE(u.name, u.username, CAST(h.changed_by AS TEXT)) as changed_by_name,
        h.changed_at
      FROM activity_approval_history h
      LEFT JOIN users u ON h.changed_by = u.id
      WHERE h.activity_id = ?
      ORDER BY h.changed_at DESC
    `,
      [activityId]
    );

    return successResponse({ history });
  } catch (error: any) {
    console.error('Get approval history error:', error);
    return errorResponse(ApiError.internalError('Không thể tải lịch sử phê duyệt'));
  }
}
