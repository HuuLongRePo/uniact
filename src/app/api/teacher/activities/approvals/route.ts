import { NextRequest } from 'next/server';
import { dbAll, dbReady } from '@/lib/database';
import { requireRole } from '@/lib/guards';
import { ApiError, successResponse, errorResponse } from '@/lib/api-response';

function mapApprovalStatusToUi(
  status: string | null | undefined
): 'draft' | 'pending' | 'approved' | 'rejected' {
  switch (status) {
    case 'requested':
      return 'pending';
    case 'approved':
      return 'approved';
    case 'rejected':
      return 'rejected';
    case 'draft':
    default:
      return 'draft';
  }
}

// GET /api/teacher/activities/approvals?status=all|pending|approved|rejected
export async function GET(request: NextRequest) {
  try {
    await dbReady();

    let user;
    try {
      user = await requireRole(request, ['teacher', 'admin']);
    } catch {
      return errorResponse(ApiError.unauthorized('Chưa đăng nhập'));
    }

    const { searchParams } = new URL(request.url);
    const filter = (searchParams.get('status') || 'all').toLowerCase();

    const where: string[] = [];
    const params: any[] = [];

    if (user.role !== 'admin') {
      where.push('a.teacher_id = ?');
      params.push(user.id);
    }

    if (filter === 'pending') {
      where.push(`a.approval_status = 'requested'`);
    } else if (filter === 'approved') {
      where.push(`a.approval_status = 'approved'`);
    } else if (filter === 'rejected') {
      where.push(`a.approval_status = 'rejected'`);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const rows = await dbAll(
      `
      SELECT
        a.id,
        a.title,
        a.description,
        a.date_time,
        a.location,
        a.approval_status,
        a.status as activity_status,
        a.created_at,
        a.submitted_at,
        a.approved_at,
        (
          SELECT aa.decided_at
          FROM activity_approvals aa
          WHERE aa.activity_id = a.id AND aa.status = 'rejected'
          ORDER BY aa.decided_at DESC
          LIMIT 1
        ) as rejected_at,
        a.rejected_reason,
        a.max_participants,
        u.name as teacher_name,
        (SELECT COUNT(*) FROM activity_classes ac WHERE ac.activity_id = a.id) as class_count
      FROM activities a
      LEFT JOIN users u ON u.id = a.teacher_id
      ${whereSql}
      ORDER BY a.created_at DESC
      `,
      params
    );

    const activities = (rows as any[]).map((r) => ({
      id: Number(r.id),
      title: String(r.title || ''),
      description: String(r.description || ''),
      date_time: String(r.date_time || ''),
      location: String(r.location || ''),
      status: mapApprovalStatusToUi(r.approval_status),
      approval_status: String(r.approval_status || ''),
      teacher_status: String(r.approval_status || ''),
      teacher_name: String(r.teacher_name || ''),
      created_at: String(r.created_at || ''),
      submitted_at: r.submitted_at ? String(r.submitted_at) : null,
      approved_at: r.approved_at ? String(r.approved_at) : null,
      rejected_at: r.rejected_at ? String(r.rejected_at) : null,
      rejection_reason: r.rejected_reason ? String(r.rejected_reason) : null,
      max_participants: r.max_participants ?? null,
      class_count: Number(r.class_count || 0),
    }));

    return successResponse({ activities });
  } catch (error: any) {
    console.error('Teacher approvals list error:', error);
    return errorResponse(
      error instanceof ApiError
        ? error
        : ApiError.internalError('Không thể tải danh sách hoạt động', { details: error?.message })
    );
  }
}
