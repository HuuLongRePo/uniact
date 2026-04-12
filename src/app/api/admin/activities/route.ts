import { NextRequest } from 'next/server';
import { dbAll, dbGet, dbReady } from '@/lib/database';
import { requireApiRole } from '@/lib/guards';
import { getActivityDisplayStatus } from '@/lib/activity-workflow';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    await dbReady();
    await requireApiRole(request, ['admin']);

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10) || 50));
    const offset = (page - 1) * limit;

    const search = (searchParams.get('search') || '').trim();
    const status = (searchParams.get('status') || '').trim();
    const approvalStatus = (searchParams.get('approval_status') || '').trim();
    const teacherId = (searchParams.get('teacher_id') || '').trim();

    const where: string[] = [];
    const bindings: any[] = [];

    if (search) {
      where.push('(a.title LIKE ? OR a.description LIKE ? OR u.name LIKE ?)');
      const like = `%${search}%`;
      bindings.push(like, like, like);
    }

    if (approvalStatus) {
      where.push('a.approval_status = ?');
      bindings.push(approvalStatus);
    }

    if (teacherId) {
      const teacherIdNumber = Number(teacherId);
      if (!teacherIdNumber || Number.isNaN(teacherIdNumber)) {
        return errorResponse(ApiError.validation('teacher_id không hợp lệ'));
      }
      where.push('a.teacher_id = ?');
      bindings.push(teacherIdNumber);
    }

    if (status) {
      if (status === 'pending') {
        where.push("a.approval_status = 'requested'");
      } else if (status === 'rejected') {
        where.push("(a.approval_status = 'rejected' OR a.status = 'rejected')");
      } else {
        where.push('a.status = ?');
        bindings.push(status);
      }
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const activities = ((await dbAll(
      `SELECT
        a.id,
        a.title,
        a.description,
        a.teacher_id,
        u.name as teacher_name,
        COALESCE(at.name, '') as activity_type,
        COALESCE(ol.name, a.organization_level, '') as organization_level,
        a.date_time,
        COALESCE(a.end_time, a.date_time) as end_time,
        a.location,
        a.max_participants,
        (SELECT COUNT(*) FROM participations p WHERE p.activity_id = a.id) as participant_count,
        COALESCE(a.base_points, 0) as points,
        a.status,
        a.approval_status,
        a.created_at
      FROM activities a
      LEFT JOIN users u ON a.teacher_id = u.id
      LEFT JOIN activity_types at ON a.activity_type_id = at.id
      LEFT JOIN organization_levels ol ON a.organization_level_id = ol.id
      ${whereSql}
      ORDER BY a.created_at DESC
      LIMIT ? OFFSET ?`,
      [...bindings, limit, offset]
    )) as any[]).map((activity) => ({
      ...activity,
      status: getActivityDisplayStatus(activity.status, activity.approval_status),
    }));

    const countRow = (await dbGet(
      `SELECT COUNT(*) as total
       FROM activities a
       LEFT JOIN users u ON a.teacher_id = u.id
       ${whereSql}`,
      bindings
    )) as any;

    const total = Number(countRow?.total || 0);

    return successResponse({
      activities: activities || [],
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Admin get activities error:', error);
    return errorResponse(
      error instanceof ApiError ||
        (error && typeof error.status === 'number' && typeof error.code === 'string')
        ? error
        : ApiError.internalError('Không thể tải danh sách hoạt động', {
            details: error?.message,
          })
    );
  }
}
