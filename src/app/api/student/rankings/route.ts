import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/guards';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import { dbAll } from '@/lib/database';

/**
 * GET /api/student/rankings
 * Get student rankings (school-wide or class-specific)
 */
export async function GET(request: NextRequest) {
  try {
    // Auth check
    let user;
    try {
      user = await requireAuth(request);
    } catch {
      return errorResponse(ApiError.unauthorized('Chưa đăng nhập'));
    }

    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope') || 'school'; // 'school' or 'class'
    const classId = searchParams.get('class_id');

    let rankings: any[] = [];
    let currentUser: any = null;

    if (scope === 'class') {
      // Class rankings
      const targetClassId = classId ? Number(classId) : user.class_id;

      if (!targetClassId) {
        return errorResponse(ApiError.validation('Vui lòng chọn lớp'));
      }

      // Get all students in class with their points
      const students = (await dbAll(
        `SELECT 
          u.id,
          u.full_name,
          u.student_code,
          c.name as class_name,
          COALESCE(SUM(CASE WHEN g.apply_to = 'hoc_tap' THEN g.total_points ELSE 0 END), 0) as hoc_tap_points,
          COALESCE(SUM(CASE WHEN g.apply_to = 'ren_luyen' THEN g.total_points ELSE 0 END), 0) as ren_luyen_points,
          COALESCE(SUM(g.total_points), 0) as total_points,
          COUNT(DISTINCT g.activity_id) as activity_count
        FROM users u
        LEFT JOIN classes c ON u.class_id = c.id
        LEFT JOIN grades g ON u.id = g.user_id
        WHERE u.role = 'student'
          AND u.is_active = 1
          AND u.class_id = ?
        GROUP BY u.id
        ORDER BY total_points DESC, u.full_name ASC`,
        [targetClassId]
      )) as any[];

      // Add rank
      rankings = students.map((student, index) => ({
        ...student,
        rank_in_class: index + 1,
        rank_in_school: 0, // Not calculated for class view
      }));

      // Find current user
      currentUser = rankings.find((r) => r.id === user.id);
    } else {
      // School-wide rankings
      const students = (await dbAll(
        `SELECT 
          u.id,
          u.full_name,
          u.student_code,
          c.name as class_name,
          u.class_id,
          COALESCE(SUM(CASE WHEN g.apply_to = 'hoc_tap' THEN g.total_points ELSE 0 END), 0) as hoc_tap_points,
          COALESCE(SUM(CASE WHEN g.apply_to = 'ren_luyen' THEN g.total_points ELSE 0 END), 0) as ren_luyen_points,
          COALESCE(SUM(g.total_points), 0) as total_points,
          COUNT(DISTINCT g.activity_id) as activity_count
        FROM users u
        LEFT JOIN classes c ON u.class_id = c.id
        LEFT JOIN grades g ON u.id = g.user_id
        WHERE u.role = 'student'
          AND u.is_active = 1
        GROUP BY u.id
        ORDER BY total_points DESC, u.full_name ASC
        LIMIT 100`,
        []
      )) as any[];

      // Add school rank
      const schoolRankings = students.map((student, index) => ({
        ...student,
        rank_in_school: index + 1,
        rank_in_class: 0, // Calculate separately
      }));

      // Calculate class ranks
      const classCounts = new Map<number, number>();
      for (const student of schoolRankings) {
        if (student.class_id) {
          const currentCount = classCounts.get(student.class_id) || 0;
          student.rank_in_class = currentCount + 1;
          classCounts.set(student.class_id, currentCount + 1);
        }
      }

      rankings = schoolRankings;
      currentUser = rankings.find((r) => r.id === user.id);
    }

    return successResponse({
      rankings,
      currentUser,
      scope,
      total: rankings.length,
    });
  } catch (error: any) {
    console.error('Get rankings error:', error);
    return errorResponse(ApiError.internalError('Lỗi khi tải bảng xếp hạng'));
  }
}
