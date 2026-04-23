import { NextRequest, NextResponse } from 'next/server';
import { dbAll, dbGet } from '@/lib/database';
import { requireAuth } from '@/lib/guards';
import { ApiError, errorResponse } from '@/lib/api-response';
import { formatDate } from '@/lib/formatters';
import { toVietnamDatetimeLocalValue } from '@/lib/timezone';

// GET /api/classes/:id/export - Export danh sách học viên lớp ra CSV
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    let user;
    try {
      user = await requireAuth(request);
    } catch (err: any) {
      return errorResponse(ApiError.unauthorized(err?.message || 'Chưa đăng nhập'));
    }

    const classId = Number(id);
    if (!classId || Number.isNaN(classId)) {
      return errorResponse(ApiError.validation('ID lớp học không hợp lệ'));
    }

    // Kiểm tra quyền
    if (user.role === 'teacher') {
      const classData = await dbGet('SELECT teacher_id FROM classes WHERE id = ?', [classId]);
      if (!classData || classData.teacher_id !== user.id) {
        return errorResponse(ApiError.forbidden('Bạn chỉ được xuất lớp học bạn phụ trách'));
      }
    } else if (user.role !== 'admin') {
      return errorResponse(ApiError.forbidden('Không có quyền truy cập'));
    }

    // Lấy thông tin lớp
    const classInfo = await dbGet(
      `SELECT c.name, u.name as teacher_name
       FROM classes c
       LEFT JOIN users u ON c.teacher_id = u.id
       WHERE c.id = ?`,
      [classId]
    );

    if (!classInfo) {
      return errorResponse(ApiError.notFound('Không tìm thấy lớp học'));
    }

    // Lấy danh sách học viên với thông tin chi tiết
    const students = await dbAll(
      `SELECT 
        u.id,
        u.name,
        u.email,
        u.created_at,
        COALESCE(SUM(ss.points), 0) as total_points,
        COUNT(DISTINCT p.activity_id) as total_activities,
        COUNT(DISTINCT CASE WHEN p.attendance_status = 'attended' THEN p.activity_id END) as attended_activities,
        COUNT(DISTINCT sa.id) as awards_count,
        (SELECT COUNT(*) + 1 FROM (
          SELECT student_id, SUM(points) as pts 
          FROM student_scores 
          WHERE student_id IN (SELECT id FROM users WHERE class_id = ?)
          GROUP BY student_id
          HAVING pts > COALESCE((SELECT SUM(points) FROM student_scores WHERE student_id = u.id), 0)
        )) as class_rank
      FROM users u
      LEFT JOIN participations p ON u.id = p.student_id
      LEFT JOIN student_scores ss ON u.id = ss.student_id
      LEFT JOIN student_awards sa ON u.id = sa.student_id
      WHERE u.class_id = ? AND u.role = 'student'
      GROUP BY u.id
      ORDER BY total_points DESC, u.name`,
      [classId, classId]
    );

    // Tạo CSV với BOM cho UTF-8
    const BOM = '\uFEFF';
    const headers = [
      'STT',
      'Mã HV',
      'Họ và tên',
      'Email',
      'Tổng điểm',
      'Xếp hạng',
      'Số hoạt động',
      'Đã điểm danh',
      'Tỷ lệ điểm danh (%)',
      'Số khen thưởng',
      'Ngày tham gia',
    ];

    const csvRows = [headers.join(',')];

    students.forEach((student, index) => {
      const attendanceRate =
        student.total_activities > 0
          ? ((student.attended_activities / student.total_activities) * 100).toFixed(1)
          : '0.0';

      const row = [
        index + 1,
        student.id,
        `"${student.name}"`,
        student.email,
        student.total_points,
        student.class_rank,
        student.total_activities,
        student.attended_activities,
        attendanceRate,
        student.awards_count,
        formatDate(student.created_at, 'date'),
      ];
      csvRows.push(row.join(','));
    });

    // Thêm thông tin tổng hợp ở cuối
    csvRows.push('');
    csvRows.push(`"Lớp:","${classInfo.name}"`);
    csvRows.push(`"Chuyên ngành:","${(classInfo as any).major || ''}"`);
    csvRows.push(`"Năm học:","${(classInfo as any).academic_year || ''}"`);
    csvRows.push(`"Giảng viên chủ nhiệm:","${classInfo.teacher_name || ''}"`);
    csvRows.push(`"Tổng số học viên:",${students.length}`);
    csvRows.push(`"Ngày xuất:",${formatDate(new Date())}`);

    const csv = BOM + csvRows.join('\n');
    const fileName = `Danh-sach-lop-${classInfo.name.replace(/\s+/g, '-')}-${toVietnamDatetimeLocalValue(new Date()).slice(0, 10)}.csv`;

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
      },
    });
  } catch (error) {
    console.error('Export class error:', error);
    return errorResponse(ApiError.internalError('Lỗi khi xuất danh sách lớp'));
  }
}
