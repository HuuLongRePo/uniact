import { NextRequest, NextResponse } from 'next/server';
import { dbAll, dbGet } from '@/lib/database';
import { requireAuth } from '@/lib/guards';
import { ApiError, errorResponse } from '@/lib/api-response';
import { formatDate } from '@/lib/formatters';
import { toVietnamDateStamp } from '@/lib/timezone';
import { buildAttachmentContentDisposition } from '@/lib/content-disposition';

type ClassInfo = {
  name: string;
  major?: string | null;
  academic_year?: string | null;
  teacher_name?: string | null;
};

// GET /api/classes/:id/export - Export danh sach hoc vien lop ra CSV
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    let user;
    try {
      user = await requireAuth(request);
    } catch (err: any) {
      return errorResponse(ApiError.unauthorized(err?.message || 'Chua dang nhap'));
    }

    const classId = Number(id);
    if (!classId || Number.isNaN(classId)) {
      return errorResponse(ApiError.validation('ID lop hoc khong hop le'));
    }

    if (user.role === 'teacher') {
      const classData = await dbGet('SELECT teacher_id FROM classes WHERE id = ?', [classId]);
      if (!classData || classData.teacher_id !== user.id) {
        return errorResponse(ApiError.forbidden('Ban chi duoc xuat lop hoc ban phu trach'));
      }
    } else if (user.role !== 'admin') {
      return errorResponse(ApiError.forbidden('Khong co quyen truy cap'));
    }

    const classInfo = (await dbGet(
      `SELECT c.name, c.major, c.academic_year, u.name as teacher_name
       FROM classes c
       LEFT JOIN users u ON c.teacher_id = u.id
       WHERE c.id = ?`,
      [classId]
    )) as ClassInfo | undefined;

    if (!classInfo) {
      return errorResponse(ApiError.notFound('Khong tim thay lop hoc'));
    }

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

    const BOM = '\uFEFF';
    const headers = [
      'STT',
      'Ma HV',
      'Ho va ten',
      'Email',
      'Tong diem',
      'Xep hang',
      'So hoat dong',
      'Da diem danh',
      'Ty le diem danh (%)',
      'So khen thuong',
      'Ngay tham gia',
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

    csvRows.push('');
    csvRows.push(`"Lop:","${classInfo.name}"`);
    csvRows.push(`"Chuyen nganh:","${classInfo.major || ''}"`);
    csvRows.push(`"Nam hoc:","${classInfo.academic_year || ''}"`);
    csvRows.push(`"Giang vien chu nhiem:","${classInfo.teacher_name || ''}"`);
    csvRows.push(`"Tong so hoc vien:",${students.length}`);
    csvRows.push(`"Ngay xuat:",${formatDate(new Date())}`);

    const csv = BOM + csvRows.join('\n');
    const dateStamp = toVietnamDateStamp(new Date());
    const fileName = `Danh-sach-lop-${classInfo.name.replace(/\s+/g, '-')}-${dateStamp}.csv`;

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': buildAttachmentContentDisposition(fileName),
      },
    });
  } catch (error) {
    console.error('Export class error:', error);
    return errorResponse(ApiError.internalError('Loi khi xuat danh sach lop'));
  }
}
