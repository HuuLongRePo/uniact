import { NextRequest } from 'next/server';
import { dbAll, dbGet } from '@/lib/database';
import { requireAuth } from '@/lib/guards';
import { ApiError, successResponse, errorResponse } from '@/lib/api-response';

// GET /api/classes/:id/students - Lấy danh sách học viên trong lớp
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

    // Admin và teacher của lớp đó có thể xem
    if (user.role === 'teacher') {
      // Check if teacher manages this class
      const classData = await dbGet('SELECT teacher_id FROM classes WHERE id = ?', [classId]);
      if (!classData || Number(classData.teacher_id) !== Number(user.id)) {
        return errorResponse(ApiError.forbidden('Bạn chỉ được xem lớp học bạn phụ trách'));
      }
    } else if (user.role !== 'admin') {
      return errorResponse(ApiError.forbidden('Không có quyền truy cập'));
    }

    const students = await dbAll(
      `SELECT 
        u.id,
        u.name,
        u.email,
        u.avatar_url,
        u.created_at,
        (SELECT COUNT(*) FROM participations WHERE student_id = u.id) as activity_count,
        (SELECT COUNT(*) FROM participations WHERE student_id = u.id AND attendance_status = 'attended') as attended_count,
        (SELECT SUM(points) FROM student_scores WHERE student_id = u.id) as total_points,
        (SELECT COUNT(*) FROM student_awards WHERE student_id = u.id) as award_count
      FROM users u
      WHERE u.class_id = ? AND u.role = 'student'
      ORDER BY total_points DESC, u.name`,
      [classId]
    );

    return successResponse({
      students,
      total: students.length,
    });
  } catch (error: any) {
    console.error('Get class students error:', error);
    return errorResponse(ApiError.internalError('Lỗi server', { details: error?.message }));
  }
}
