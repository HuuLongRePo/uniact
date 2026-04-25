import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/guards';
import { dbHelpers } from '@/lib/database';
import { ApiError, errorResponse } from '@/lib/api-response';
import { toVietnamFileTimestamp } from '@/lib/timezone';
import { buildAttachmentContentDisposition } from '@/lib/content-disposition';

function toCsvValue(value: any): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return errorResponse(ApiError.unauthorized('Chưa đăng nhập'));
    }

    const params = request.nextUrl?.searchParams;
    const class_id = params?.get('class_id') ? Number(params.get('class_id')) : undefined;
    const start_date = params?.get('start_date') || undefined;
    const end_date = params?.get('end_date') || undefined;

    if (user.role === 'student') {
      return errorResponse(ApiError.forbidden('Không có quyền truy cập'));
    }

    if (user.role === 'teacher' && !class_id) {
      return errorResponse(ApiError.validation('Giảng viên cần cung cấp class_id để xuất dữ liệu'));
    }

    const data = await dbHelpers.getAttendanceExportData({
      class_id,
      start_date,
      end_date,
    });

    const header = [
      'attendance_id',
      'activity_id',
      'activity_title',
      'student_id',
      'student_name',
      'student_email',
      'class_name',
      'status',
      'method',
      'recorded_at',
    ];
    const rows = (data || []).map((row: any) =>
      [
        toCsvValue(row.id),
        toCsvValue(row.activity_id),
        toCsvValue(row.activity_title || ''),
        toCsvValue(row.student_id),
        toCsvValue(row.student_name || ''),
        toCsvValue(row.student_email || ''),
        toCsvValue(row.class_name || ''),
        toCsvValue(row.status || ''),
        toCsvValue(row.method || ''),
        toCsvValue(row.recorded_at || ''),
      ].join(',')
    );

    const csv = [header.join(','), ...rows].join('\n');
    const filename = `attendance-export-${toVietnamFileTimestamp(new Date())}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': buildAttachmentContentDisposition(filename),
      },
    });
  } catch (error: any) {
    console.error('Export attendance error:', error);
    return errorResponse(ApiError.internalError('Lỗi máy chủ nội bộ'));
  }
}
