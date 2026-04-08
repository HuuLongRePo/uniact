import { NextRequest, NextResponse } from 'next/server';
import { dbAll, dbHelpers } from '@/lib/database';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import { requireApiRole } from '@/lib/guards';

// GET /api/users/export - Export danh sách người dùng ra CSV
export async function GET(request: NextRequest) {
  try {
    const user = await requireApiRole(request, ['admin']);

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role') || 'student';
    const format = searchParams.get('format') || 'csv';

    if (!['admin', 'teacher', 'student'].includes(role)) {
      return errorResponse(ApiError.validation('Vai trò không hợp lệ'));
    }

    // Fetch users with stats
    const query = `
      SELECT 
        u.id,
        u.student_id,
        u.name,
        u.email,
        u.role,
        u.class_id,
        c.name as class_name,
        u.created_at,
        COALESCE(SUM(CASE WHEN ss.score IS NOT NULL THEN ss.score ELSE 0 END), 0) as total_points,
        COUNT(DISTINCT p.id) as activity_count,
        COUNT(DISTINCT sa.id) as award_count
      FROM users u
      LEFT JOIN classes c ON u.class_id = c.id
      LEFT JOIN participations p ON u.id = p.student_id
      LEFT JOIN student_scores ss ON u.id = ss.student_id
      LEFT JOIN student_awards sa ON u.id = sa.student_id
      WHERE u.role = ?
      GROUP BY u.id
      ORDER BY u.name
    `;

    const users = await dbAll(query, [role]);

    if (format === 'csv') {
      // Generate CSV
      const headers = [
        'ID',
        'Mã học viên',
        'Tên',
        'Email',
        'Vai trò',
        'Lớp',
        'Tổng điểm',
        'Số hoạt động',
        'Số giải thưởng',
        'Ngày tạo',
      ];

      const rows = users.map((u: any) => [
        u.id,
        u.student_id || '',
        u.name,
        u.email,
        u.role === 'student' ? 'Học viên' : u.role === 'teacher' ? 'Giảng viên' : 'Admin',
        u.class_name || '',
        u.total_points || 0,
        u.activity_count || 0,
        u.award_count || 0,
        new Date(u.created_at).toLocaleDateString('vi-VN'),
      ]);

      const csvContent = [
        '\uFEFF' + headers.join(','), // BOM for UTF-8
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
      ].join('\n');

      const filename = `users-${role}-${new Date().toISOString().split('T')[0]}.csv`;

      await dbHelpers.createAuditLog(
        user.id,
        'EXPORT',
        'users',
        null,
        JSON.stringify({ role, format, total: users.length })
      );

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    // JSON fallback
    await dbHelpers.createAuditLog(
      user.id,
      'EXPORT',
      'users',
      null,
      JSON.stringify({ role, format: 'json', total: users.length })
    );

    return successResponse({ users });
  } catch (error: any) {
    console.error('Lỗi export danh sách người dùng:', error);
    return errorResponse(ApiError.internalError('Lỗi máy chủ'));
  }
}
