import { NextRequest, NextResponse } from 'next/server';
import { getUserFromSession } from '@/lib/auth';
import { dbAll } from '@/lib/database';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

// GET /api/admin/scores - Get all student scores with export option
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromSession();
    if (!user) return errorResponse(ApiError.unauthorized('Unauthorized'));
    if (user.role !== 'admin') return errorResponse(ApiError.forbidden('Forbidden'));

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const classId = searchParams.get('class_id') || '';
    const minPoints = searchParams.get('min_points') || '';
    const exportFormat = searchParams.get('export') || '';

    // Build query
    let query = `
      SELECT 
        u.id as user_id,
        u.name as name,
        u.email as email,
        u.class_id as class_id,
        c.name as class_name,
        COALESCE(SUM(CASE WHEN p.attendance_status IN ('present', 'attended') THEN pc.total_points ELSE 0 END), 0)
          + COALESCE((SELECT SUM(ss.points) FROM student_scores ss WHERE ss.student_id = u.id AND ss.source LIKE 'adjustment:%'), 0)
          as total_points,
        COUNT(DISTINCT CASE WHEN p.attendance_status IN ('registered', 'present', 'attended') THEN p.activity_id END) as activities_count,
        COUNT(DISTINCT CASE WHEN p.attendance_status IN ('present', 'attended') THEN p.activity_id END) as participated_count,
        COUNT(DISTINCT CASE WHEN p.attendance_status IN ('present', 'attended') AND p.achievement_level = 'excellent' THEN p.activity_id END) as excellent_count,
        COUNT(DISTINCT CASE WHEN p.attendance_status IN ('present', 'attended') AND p.achievement_level = 'good' THEN p.activity_id END) as good_count,
        COUNT(DISTINCT CASE WHEN p.attendance_status IN ('present', 'attended') AND p.achievement_level = 'average' THEN p.activity_id END) as average_count,
        (SELECT COUNT(*) FROM student_awards sa WHERE sa.student_id = u.id) as awards_count
      FROM users u
      LEFT JOIN classes c ON u.class_id = c.id
      LEFT JOIN participations p ON u.id = p.student_id
      LEFT JOIN point_calculations pc ON pc.participation_id = p.id
      WHERE u.role = 'student'
        AND (u.is_active IS NULL OR u.is_active = 1)
    `;

    const params: any[] = [];

    if (search) {
      query += ` AND (u.name LIKE ? OR u.email LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    if (classId) {
      query += ` AND u.class_id = ?`;
      params.push(classId);
    }

    query += ` GROUP BY u.id, u.name, u.email, u.class_id, c.name`;

    if (minPoints) {
      query += ` HAVING total_points >= ?`;
      params.push(parseInt(minPoints));
    }

    query += ` ORDER BY total_points DESC, u.name ASC`;

    const scores = await dbAll(query, params);

    // Add rank
    const scoresWithRank = scores.map((score: any, index: number) => ({
      ...score,
      rank: index + 1,
    }));

    // CSV Export
    if (exportFormat === 'csv') {
      const csvHeader = 'Hạng,Tên,Email,Lớp,Tổng điểm,Hoạt động,Xuất sắc,Tốt,TB,Giải thưởng\n';
      const csvRows = scoresWithRank
        .map(
          (s: any) =>
            `${s.rank},"${s.name}","${s.email}","${s.class_name || ''}",${s.total_points},${s.activities_count},${s.excellent_count},${s.good_count},${s.average_count},${s.awards_count}`
        )
        .join('\n');

      const csv = csvHeader + csvRows;

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="scores-${Date.now()}.csv"`,
        },
      });
    }

    return successResponse({ scores: scoresWithRank });
  } catch (error: any) {
    console.error('Get scores error:', error);
    return errorResponse(ApiError.internalError(error.message || 'Internal server error'));
  }
}
