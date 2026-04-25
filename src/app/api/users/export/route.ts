import { NextRequest, NextResponse } from 'next/server';
import { dbAll, dbHelpers } from '@/lib/database';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import { requireApiRole } from '@/lib/guards';
import { formatVietnamDateTime, toVietnamDateStamp } from '@/lib/timezone';
import { buildAttachmentContentDisposition } from '@/lib/content-disposition';

// GET /api/users/export - Export danh sach nguoi dung ra CSV
export async function GET(request: NextRequest) {
  try {
    const user = await requireApiRole(request, ['admin']);

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role') || 'student';
    const format = searchParams.get('format') || 'csv';

    if (!['admin', 'teacher', 'student'].includes(role)) {
      return errorResponse(ApiError.validation('Vai tro khong hop le'));
    }

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
      const headers = [
        'ID',
        'Ma hoc vien',
        'Ten',
        'Email',
        'Vai tro',
        'Lop',
        'Tong diem',
        'So hoat dong',
        'So giai thuong',
        'Ngay tao',
      ];

      const rows = users.map((row: any) => [
        row.id,
        row.student_id || '',
        row.name,
        row.email,
        row.role === 'student' ? 'Hoc vien' : row.role === 'teacher' ? 'Giang vien' : 'Admin',
        row.class_name || '',
        row.total_points || 0,
        row.activity_count || 0,
        row.award_count || 0,
        formatVietnamDateTime(row.created_at, 'date'),
      ]);

      const csvContent = [
        '\uFEFF' + headers.join(','),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
      ].join('\n');

      const filename = `users-${role}-${toVietnamDateStamp(new Date())}.csv`;

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
          'Content-Disposition': buildAttachmentContentDisposition(filename),
        },
      });
    }

    await dbHelpers.createAuditLog(
      user.id,
      'EXPORT',
      'users',
      null,
      JSON.stringify({ role, format: 'json', total: users.length })
    );

    return successResponse({ users });
  } catch (error: any) {
    console.error('Loi export danh sach nguoi dung:', error);
    return errorResponse(ApiError.internalError('Loi may chu'));
  }
}
