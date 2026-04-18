import { NextRequest } from 'next/server';
import { requireApiRole } from '@/lib/guards';
import { dbAll, dbGet } from '@/lib/database';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import { getFinalScoreLedgerByStudentIds } from '@/lib/score-ledger';

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

    const total = (await dbGet(
      `SELECT COUNT(*) as total FROM users u ${whereFiltered}`,
      [...paramsFiltered]
    )) as { total?: number } | undefined;

    const students = (await dbAll(
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
        (SELECT COUNT(*) FROM student_awards WHERE student_id = u.id) as award_count
      FROM users u
      LEFT JOIN classes c ON u.class_id = c.id
      ${whereFiltered}
      ORDER BY u.created_at DESC, u.id DESC
      LIMIT ? OFFSET ?`,
      [...paramsFiltered, limit, offset]
    )) as Array<any>;

    const ledgers = await getFinalScoreLedgerByStudentIds(students.map((student) => Number(student.id)));
    const studentsWithTotals = students.map((student) => ({
      ...student,
      total_points: ledgers.get(Number(student.id))?.final_total || 0,
    }));

    const filteredStudentIds = (await dbAll(
      `SELECT u.id FROM users u ${whereFiltered}`,
      [...paramsFiltered]
    )) as Array<{ id: number }>;
    const filteredLedgers = await getFinalScoreLedgerByStudentIds(filteredStudentIds.map((student) => Number(student.id)));

    const filteredTotals = filteredStudentIds.map(
      (student) => filteredLedgers.get(Number(student.id))?.final_total || 0
    );

    const filteredAwardCounts = studentsWithTotals.reduce(
      (sum, student) => sum + Number(student.award_count || 0),
      0
    );

    const classSummary = classId
      ? (() => {
          const classIds = filteredStudentIds.map((student) => Number(student.id));
          const classTotals = classIds.map((id) => filteredLedgers.get(id)?.final_total || 0);
          return {
            total: classIds.length,
            activity_count: studentsWithTotals.reduce((sum, student) => sum + Number(student.activity_count || 0), 0),
            attended_count: studentsWithTotals.reduce((sum, student) => sum + Number(student.attended_count || 0), 0),
            total_points: classTotals.reduce((sum, points) => sum + points, 0),
            avg_points: classTotals.length > 0 ? classTotals.reduce((sum, points) => sum + points, 0) / classTotals.length : 0,
            award_count: filteredAwardCounts,
          };
        })()
      : null;

    return successResponse({
      students: studentsWithTotals,
      summary: {
        total: total?.total || 0,
        activity_count: studentsWithTotals.reduce((sum, student) => sum + Number(student.activity_count || 0), 0),
        attended_count: studentsWithTotals.reduce((sum, student) => sum + Number(student.attended_count || 0), 0),
        total_points: filteredTotals.reduce((sum, points) => sum + points, 0),
        avg_points: filteredTotals.length > 0 ? filteredTotals.reduce((sum, points) => sum + points, 0) / filteredTotals.length : 0,
        award_count: filteredAwardCounts,
      },
      classSummary,
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
