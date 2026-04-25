import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/guards';
import { dbHelpers, dbAll } from '@/lib/database';
import Papa from 'papaparse';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import { toVietnamDateStamp } from '@/lib/timezone';
import { buildAttachmentContentDisposition } from '@/lib/content-disposition';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return errorResponse(ApiError.unauthorized('Chưa đăng nhập'));
    }

    const params = request.nextUrl.searchParams;
    const classIdStr = params.get('class_id');
    const class_id = classIdStr ? Number(classIdStr) : undefined;

    // --- Permission Checks ---
    if (user.role === 'student') {
      // Students can only export their own class data
      if (!user.class_id) {
        return errorResponse(ApiError.forbidden('Học viên chưa được gán vào lớp'));
      }
      if (class_id && class_id !== user.class_id) {
        return errorResponse(ApiError.forbidden('Không có quyền xuất dữ liệu lớp khác'));
      }
    }

    if (user.role === 'teacher') {
      if (!class_id) {
        return errorResponse(ApiError.validation('Giảng viên cần cung cấp `class_id`'));
      }
      // Verify teacher is assigned to the requested class
      const teacherClasses = await dbAll('SELECT id FROM classes WHERE teacher_id = ?', [user.id]);
      const isAuthorized = teacherClasses.some((c) => c.id === class_id);
      if (!isAuthorized) {
        return errorResponse(ApiError.forbidden('Bạn không phụ trách lớp này'));
      }
    }
    // Admin has no restrictions

    const data = await dbHelpers.getScoreboardExportData({
      // If user is a student, force their class_id
      class_id: user.role === 'student' ? user.class_id : class_id,
    });

    if (!data || data.length === 0) {
      return successResponse({ rows: 0 }, 'Không có dữ liệu để xuất', 200);
    }

    // --- CSV Generation ---
    const csvData = data.map((row) => ({
      'Mã Sinh Viên': row.id,
      'Họ và Tên': row.name,
      Email: row.email,
      Lớp: row.class_name || '',
      'Tổng Điểm': row.total_score || 0,
      'Số Hoạt Động': row.activities_count || 0,
    }));

    const csv = Papa.unparse(csvData);
    const filename = `scoreboard-export-${toVietnamDateStamp(new Date())}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': buildAttachmentContentDisposition(filename),
      },
    });
  } catch (error: any) {
    console.error('Export scoreboard error:', error);
    return errorResponse(ApiError.internalError('Lỗi máy chủ nội bộ'));
  }
}
