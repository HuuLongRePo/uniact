import { NextRequest } from 'next/server';
import { dbAll } from '@/lib/database';
import { ApiError, successResponse, errorResponse } from '@/lib/api-response';
import { requireApiRole } from '@/lib/guards';
import { getFinalScoreLedgerByStudentIds } from '@/lib/score-ledger';

/**
 * GET /api/teacher/students
 * Lấy danh sách học viên của giảng viên
 * Query params:
 *   - class_id: number (optional) - Filter theo lớp
 *   - search: string (optional) - Tìm theo tên/email
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireApiRole(request, ['teacher']);

    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('class_id');
    const search = searchParams.get('search') || '';

    const allClasses = (await dbAll(
      `
      SELECT c.id, c.name, c.grade
      FROM classes c
      ORDER BY c.grade ASC, c.name ASC
      `
    )) as Array<{ id: number; name: string; grade: string }>;

    if (allClasses.length === 0) {
      return successResponse(
        {
          students: [],
          classes: [],
          total: 0,
        },
        'Chưa có lớp nào trong hệ thống'
      );
    }

    const classIds = allClasses.map((item) => Number(item.id));

    // Teacher hiện có thể xem toàn bộ lớp/học viên trên surface này.
    // Permission mutation chi tiết vẫn do từng route nghiệp vụ kiểm soát.
    let whereClause = `u.class_id IN (${classIds.join(',')})`;
    const params: any[] = [];

    if (classId) {
      whereClause += ' AND u.class_id = ?';
      params.push(Number(classId));
    }

    if (search.trim()) {
      whereClause += ` AND (u.name LIKE ? OR u.email LIKE ?)`;
      const searchPattern = `%${search.trim()}%`;
      params.push(searchPattern, searchPattern);
    }

    // Query students with activity counts, then overlay canonical final totals
    const studentRows = (await dbAll(
      `
      SELECT 
        u.id,
        u.email,
        u.name,
        u.avatar_url,
        u.class_id,
        c.name as class_name,
        COUNT(DISTINCT p.id) as activities_count
      FROM users u
      LEFT JOIN classes c ON c.id = u.class_id
      LEFT JOIN participations p ON p.student_id = u.id 
        AND p.attendance_status IN ('attended', 'registered')
      WHERE u.role = 'student'
        AND ${whereClause}
      GROUP BY u.id, u.email, u.name, u.avatar_url, u.class_id, c.name
      ORDER BY u.name ASC
      `,
      params
    )) as Array<{
      id: number;
      email: string;
      name: string;
      avatar_url?: string;
      class_id: number;
      class_name: string;
      activities_count: number;
    }>;

    const ledgers = await getFinalScoreLedgerByStudentIds(studentRows.map((student) => student.id));
    const students = studentRows
      .map((student) => ({
        ...student,
        total_points: ledgers.get(Number(student.id))?.final_total || 0,
      }))
      .sort((left, right) => {
        if (right.total_points !== left.total_points) {
          return right.total_points - left.total_points;
        }
        return String(left.name).localeCompare(String(right.name));
      });

    const classes = allClasses;

    return successResponse({
      students: students.map((student) => ({
        ...student,
        full_name: student.name,
        total_score: student.total_points,
        activity_count: student.activities_count,
        attended_count: 0,
      })),
      classes,
      total: students.length,
    });
  } catch (error: any) {
    console.error('Lỗi lấy danh sách học viên của giảng viên:', error);
    return errorResponse(
      error instanceof ApiError ||
        (error && typeof error.status === 'number' && typeof error.code === 'string')
        ? error
        : ApiError.internalError('Không thể lấy danh sách học viên', { details: error?.message })
    );
  }
}
