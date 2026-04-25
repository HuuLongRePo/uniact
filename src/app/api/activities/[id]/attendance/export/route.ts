import { NextRequest } from 'next/server';
import { dbAll, dbGet } from '@/lib/database';
import { requireRole } from '@/lib/guards';
import { ApiError, errorResponse } from '@/lib/api-response';
import { teacherCanAccessActivity } from '@/lib/activity-access';
import { createWorkbookFromJsonSheets } from '@/lib/excel-export';
import { toVietnamDateStamp } from '@/lib/timezone';
import { buildAttachmentContentDisposition } from '@/lib/content-disposition';

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

    const activity = (await dbGet(
      'SELECT id, teacher_id, title, date_time FROM activities WHERE id = ?',
      [activityId]
    )) as any;
    if (!activity) return errorResponse(ApiError.notFound('Không tìm thấy hoạt động'));

    if (
      user.role === 'teacher' &&
      !(await teacherCanAccessActivity(Number(user.id), Number(activityId)))
    ) {
      return errorResponse(
        ApiError.forbidden('Bạn chỉ có thể xuất dữ liệu của hoạt động thuộc phạm vi quản lý')
      );
    }

    // Students are derived from activity_classes if present, else from participations
    const classIds = (await dbAll('SELECT class_id FROM activity_classes WHERE activity_id = ?', [
      activityId,
    ])) as Array<{ class_id: number }>;

    let students: any[] = [];
    if (classIds && classIds.length > 0) {
      const placeholders = classIds.map(() => '?').join(',');
      students = (await dbAll(
        `SELECT 
          u.id as student_id,
          COALESCE(u.student_code, u.code, u.username, u.student_id) as student_code,
          COALESCE(u.full_name, u.name) as student_name
        FROM users u
        WHERE u.role = 'student' AND u.is_active = 1 AND u.class_id IN (${placeholders})
        ORDER BY COALESCE(u.full_name, u.name)`,
        classIds.map((c) => c.class_id)
      )) as any[];
    } else {
      students = (await dbAll(
        `SELECT DISTINCT
          u.id as student_id,
          COALESCE(u.student_code, u.code, u.username, u.student_id) as student_code,
          COALESCE(u.full_name, u.name) as student_name
        FROM participations p
        JOIN users u ON u.id = p.student_id
        WHERE p.activity_id = ?
        ORDER BY COALESCE(u.full_name, u.name)`,
        [activityId]
      )) as any[];
    }

    const marks = (await dbAll(
      `SELECT 
        p.student_id,
        p.attendance_status,
        p.achievement_level
      FROM participations p
      WHERE p.activity_id = ?`,
      [activityId]
    )) as any[];

    const byStudent = new Map<number, any>();
    for (const m of marks || []) byStudent.set(Number(m.student_id), m);

    const rows = (students || []).map((s) => {
      const m = byStudent.get(Number(s.student_id));
      const status =
        m?.attendance_status === 'attended'
          ? 'Có mặt'
          : m?.attendance_status === 'absent'
            ? 'Vắng mặt'
            : 'Chưa điểm danh';
      return {
        'Mã SV': s.student_code,
        'Họ tên': s.student_name,
        'Trạng thái': status,
        'Mức độ': m?.achievement_level ?? '',
      };
    });

    const buffer = await createWorkbookFromJsonSheets([{ name: 'DauDanh', rows }]);
    const ab = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength
    ) as ArrayBuffer;

    const dateStr = toVietnamDateStamp(activity.date_time || new Date()) || toVietnamDateStamp(new Date());
    const filename = `dau-danh-${activityId}-${dateStr}.xlsx`;

    return new Response(ab, {
      status: 200,
      headers: new Headers({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': buildAttachmentContentDisposition(filename),
      }),
    });
  } catch (error: any) {
    console.error('Export activity attendance error:', error);
    return errorResponse(ApiError.internalError('Không thể xuất file điểm danh', error?.message));
  }
}
