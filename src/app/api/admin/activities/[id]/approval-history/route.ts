import { NextRequest } from 'next/server';
import { requireApiRole } from '@/lib/guards';
import { dbAll } from '@/lib/database';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

function getApprovalHistoryStatusLabel(status: string) {
  switch (status) {
    case 'pending_approval':
    case 'requested':
      return 'Đã gửi duyệt';
    case 'approved':
      return 'Đã phê duyệt';
    case 'rejected':
      return 'Đã từ chối';
    case 'draft':
      return 'Bản nháp';
    default:
      return 'Cập nhật trạng thái duyệt';
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireApiRole(request, ['admin']);

    const { id } = await params;
    const activityId = id;

    const history = (
      (await dbAll(
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
      )) as Array<any>
    ).map((item) => ({
      ...item,
      status_label: getApprovalHistoryStatusLabel(item.status),
      is_pending_request: item.status === 'requested' || item.status === 'pending_approval',
    }));

    return successResponse({ history });
  } catch (error: any) {
    console.error('Get approval history error:', error);
    return errorResponse(
      error instanceof ApiError
        ? error
        : ApiError.internalError('Không thể tải lịch sử phê duyệt', {
            details: error?.message,
          })
    );
  }
}
