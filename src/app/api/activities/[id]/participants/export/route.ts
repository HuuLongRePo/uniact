import { NextRequest, NextResponse } from 'next/server';
import { dbAll, dbGet } from '@/lib/database';
import { requireRole } from '@/lib/guards';
import { ApiError, errorResponse } from '@/lib/api-response';
import { teacherCanAccessActivity } from '@/lib/activity-access';
import { toVietnamDateStamp } from '@/lib/timezone';
import { buildAttachmentContentDisposition } from '@/lib/content-disposition';

function toCsvValue(value: any): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    let user;
    try {
      user = await requireRole(request, ['teacher', 'admin']);
    } catch (err: any) {
      const msg = String(err?.message || '');
      return errorResponse(
        msg.includes('Chưa đăng nhập')
          ? ApiError.unauthorized('Chưa đăng nhập')
          : ApiError.forbidden('Không có quyền truy cập')
      );
    }

    const { id } = await params;
    const activityId = Number(id);
    if (!Number.isFinite(activityId)) {
      return errorResponse(ApiError.validation('ID hoạt động không hợp lệ'));
    }

    const activity = (await dbGet('SELECT id, teacher_id, title FROM activities WHERE id = ?', [
      activityId,
    ])) as any;
    if (!activity) return errorResponse(ApiError.notFound('Không tìm thấy hoạt động'));

    if (
      user.role === 'teacher' &&
      !(await teacherCanAccessActivity(Number(user.id), Number(activityId)))
    ) {
      return errorResponse(ApiError.forbidden('Bạn chỉ có thể thao tác trên hoạt động của mình'));
    }

    const rows = (await dbAll(
      `SELECT 
        p.student_id,
        COALESCE(u.student_code, u.code, u.username, u.student_id) as student_code,
        COALESCE(u.full_name, u.name) as student_name,
        u.email as student_email,
        p.attendance_status,
        p.achievement_level,
        p.evaluated_at
      FROM participations p
      JOIN users u ON u.id = p.student_id
      WHERE p.activity_id = ?
      ORDER BY COALESCE(u.full_name, u.name)`,
      [activityId]
    )) as any[];

    const header = [
      'student_id',
      'student_code',
      'student_name',
      'student_email',
      'attendance_status',
      'achievement_level',
      'evaluated_at',
    ];
    const csvRows = (rows || []).map((r) =>
      [
        toCsvValue(r.student_id),
        toCsvValue(r.student_code),
        toCsvValue(r.student_name),
        toCsvValue(r.student_email),
        toCsvValue(r.attendance_status),
        toCsvValue(r.achievement_level),
        toCsvValue(r.evaluated_at),
      ].join(',')
    );

    const csv = [header.join(','), ...csvRows].join('\n');
    const filename = `participants-${activityId}-${toVietnamDateStamp(new Date())}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': buildAttachmentContentDisposition(filename),
      },
    });
  } catch (error: any) {
    console.error('Export participants error:', error);
    return errorResponse(
      ApiError.internalError('Không thể xuất danh sách học viên', error?.message)
    );
  }
}
