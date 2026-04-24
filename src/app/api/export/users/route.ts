import { NextRequest, NextResponse } from 'next/server';
import { dbAll, dbReady } from '@/lib/database';
import { getUserFromRequest } from '@/lib/guards';
import Papa from 'papaparse';
import { ApiError, errorResponse } from '@/lib/api-response';
import { toVietnamDateStamp } from '@/lib/timezone';

// GET /api/export/users?format=csv|excel
export async function GET(request: NextRequest) {
  await dbReady();
  const user = await getUserFromRequest(request);
  if (!user || user.role !== 'admin') {
    return errorResponse(ApiError.forbidden('Không có quyền truy cập'));
  }

  const format = request.nextUrl.searchParams.get('format') || 'csv';
  const role = request.nextUrl.searchParams.get('role') || '';

  const whereClauses: string[] = [];
  const params: any[] = [];
  if (role) {
    whereClauses.push('role = ?');
    params.push(role);
  }
  const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // Select all user fields, including new citizen fields
  const users = await dbAll(
    `
    SELECT 
      id,
      email,
      username,
      name as full_name,
      role,
      COALESCE(student_code, code, username) as student_code,
      phone,
      teacher_rank,
      academic_title,
      academic_degree,
      (SELECT c2.name FROM classes c2 WHERE c2.teacher_id = users.id ORDER BY c2.created_at DESC LIMIT 1) as teaching_class_name,
      gender,
      date_of_birth,
      citizen_id,
      province,
      district,
      ward,
      address_detail,
      class_id,
      created_at
    FROM users
    ${whereSql}
    ORDER BY created_at DESC
  `,
    params
  );

  if (format === 'csv') {
    const csv = Papa.unparse(users, {
      columns: [
        'id',
        'email',
        'username',
        'full_name',
        'role',
        'student_code',
        'phone',
        'teacher_rank',
        'academic_title',
        'academic_degree',
        'teaching_class_name',
        'gender',
        'date_of_birth',
        'citizen_id',
        'province',
        'district',
        'ward',
        'address_detail',
        'class_id',
        'created_at',
      ],
    });
    const filename = `users-export-${toVietnamDateStamp(new Date())}.csv`;
    return new NextResponse('\uFEFF' + csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  }

  // Excel export: TODO (can use exceljs or similar if needed)
  return errorResponse(ApiError.validation('Chỉ hỗ trợ CSV hiện tại.'));
}
