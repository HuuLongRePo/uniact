import { NextRequest } from 'next/server';
import { requireApiRole } from '@/lib/guards';
import { dbAll, dbGet } from '@/lib/database';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

// GET /api/admin/students - List students (admin only)
export async function GET(request: NextRequest) {
  try {
    await requireApiRole(request, ['admin']);

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '50', 10) || 50);
    const search = (searchParams.get('search') || '').trim();
    const classId = (searchParams.get('class_id') || '').trim();
    const includeInactive = (searchParams.get('include_inactive') || '').trim() === '1';

    const offset = (page - 1) * limit;

    let whereBase = `WHERE u.role = 'student'`;
    if (!includeInactive) {
      whereBase += ` AND (u.is_active IS NULL OR u.is_active = 1)`;
    }
    const paramsBase: any[] = [];
    if (classId) {
      whereBase += ` AND u.class_id = ?`;
      paramsBase.push(Number(classId));
    }

    let whereFiltered = whereBase;
    const paramsFiltered: any[] = [...paramsBase];
    if (search) {
      whereFiltered += ` AND (u.name LIKE ? OR u.email LIKE ? OR u.username LIKE ? OR u.code LIKE ? OR u.student_code LIKE ?)`;
      const p = `%${search}%`;
      paramsFiltered.push(p, p, p, p, p);
    }

    const summaryRow = (await dbGet(
      `SELECT
        COUNT(*) as total,
        COALESCE(SUM((SELECT COUNT(*) FROM participations p WHERE p.student_id = u.id)), 0) as activity_count,
        COALESCE(SUM((SELECT COUNT(*) FROM participations p WHERE p.student_id = u.id AND p.attendance_status = 'attended')), 0) as attended_count,
        COALESCE(SUM(COALESCE((SELECT SUM(points) FROM student_scores ss WHERE ss.student_id = u.id), 0)), 0) as total_points,
        COALESCE(AVG(COALESCE((SELECT SUM(points) FROM student_scores ss WHERE ss.student_id = u.id), 0)), 0) as avg_points,
        COALESCE(SUM((SELECT COUNT(*) FROM student_awards sa WHERE sa.student_id = u.id)), 0) as award_count
      FROM users u
      ${whereFiltered}`,
      [...paramsFiltered]
    )) as any;

    const classSummaryRow = classId
      ? ((await dbGet(
          `SELECT
            COUNT(*) as total,
            COALESCE(SUM((SELECT COUNT(*) FROM participations p WHERE p.student_id = u.id)), 0) as activity_count,
            COALESCE(SUM((SELECT COUNT(*) FROM participations p WHERE p.student_id = u.id AND p.attendance_status = 'attended')), 0) as attended_count,
            COALESCE(SUM(COALESCE((SELECT SUM(points) FROM student_scores ss WHERE ss.student_id = u.id), 0)), 0) as total_points,
            COALESCE(AVG(COALESCE((SELECT SUM(points) FROM student_scores ss WHERE ss.student_id = u.id), 0)), 0) as avg_points,
            COALESCE(SUM((SELECT COUNT(*) FROM student_awards sa WHERE sa.student_id = u.id)), 0) as award_count
          FROM users u
          ${whereBase}`,
          [...paramsBase]
        )) as any)
      : null;

    const total = summaryRow?.total || 0;

    const students = await dbAll(
      `SELECT 
        u.id,
        u.email,
        u.username,
        u.name,
        u.role,
        COALESCE(u.student_code, u.code, u.username) as student_code,
        u.class_id,
        c.name as class_name,
        u.created_at,
        (SELECT COUNT(*) FROM participations WHERE student_id = u.id) as activity_count,
        (SELECT COUNT(*) FROM participations WHERE student_id = u.id AND attendance_status = 'attended') as attended_count,
        (SELECT COUNT(*) FROM student_awards WHERE student_id = u.id) as award_count,
        COALESCE((SELECT SUM(points) FROM student_scores WHERE student_id = u.id), 0) as total_points
      FROM users u
      LEFT JOIN classes c ON u.class_id = c.id
      ${whereFiltered}
      ORDER BY u.created_at DESC, u.id DESC
      LIMIT ? OFFSET ?`,
      [...paramsFiltered, limit, offset]
    );

    return successResponse({
      students,
      summary: {
        total,
        activity_count: summaryRow?.activity_count || 0,
        attended_count: summaryRow?.attended_count || 0,
        total_points: summaryRow?.total_points || 0,
        avg_points: summaryRow?.avg_points || 0,
        award_count: summaryRow?.award_count || 0,
      },
      classSummary: classSummaryRow
        ? {
            total: classSummaryRow?.total || 0,
            activity_count: classSummaryRow?.activity_count || 0,
            attended_count: classSummaryRow?.attended_count || 0,
            total_points: classSummaryRow?.total_points || 0,
            avg_points: classSummaryRow?.avg_points || 0,
            award_count: classSummaryRow?.award_count || 0,
          }
        : null,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching students:', error);
    return errorResponse(
      error instanceof ApiError ||
        (error && typeof error.status === 'number' && typeof error.code === 'string')
        ? error
        : ApiError.internalError('Không thể tải danh sách học viên', { details: error?.message })
    );
  }
}
