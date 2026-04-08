import { NextRequest, NextResponse } from 'next/server';
import { dbAll, dbGet } from '@/lib/database';
import { getUserFromToken } from '@/lib/auth';
import { ApiError, successResponse, errorResponse } from '@/lib/api-response';

// GET /api/students/:id/profile - Xem hồ sơ chi tiết học viên (teacher + admin)
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return errorResponse(ApiError.unauthorized('Unauthorized'));
    }

    const user = await getUserFromToken(token);
    if (!user) {
      return errorResponse(ApiError.unauthorized('Unauthorized'));
    }

    const studentId = parseInt(id);

    // Lấy thông tin học viên
    const student = await dbGet(
      `SELECT 
        u.id, u.name, u.email, u.avatar_url, u.class_id, u.created_at,
        c.name as class_name
      FROM users u
      LEFT JOIN classes c ON u.class_id = c.id
      WHERE u.id = ? AND u.role = 'student'`,
      [studentId]
    );

    if (!student) {
      return errorResponse(ApiError.notFound('Học viên không tồn tại'));
    }

    // Kiểm tra quyền: teacher chỉ xem học viên trong lớp của mình
    if (user.role === 'teacher') {
      const teacherClass = await dbGet('SELECT id FROM classes WHERE teacher_id = ? AND id = ?', [
        user.id,
        student.class_id,
      ]);
      if (!teacherClass) {
        return errorResponse(ApiError.forbidden('Forbidden'));
      }
    } else if (user.role !== 'admin') {
      return errorResponse(ApiError.forbidden('Forbidden'));
    }

    // Lấy tổng điểm và xếp hạng
    const scoreData = await dbGet(
      `SELECT 
        COALESCE(SUM(points), 0) as total_points,
        (SELECT COUNT(*) + 1 FROM (
          SELECT student_id, SUM(points) as pts 
          FROM student_scores 
          WHERE student_id IN (SELECT id FROM users WHERE class_id = ?)
          GROUP BY student_id
          HAVING pts > COALESCE((SELECT SUM(points) FROM student_scores WHERE student_id = ?), 0)
        )) as class_rank
      FROM student_scores
      WHERE student_id = ?`,
      [student.class_id, studentId, studentId]
    );

    // Lấy lịch sử tham gia hoạt động
    const activities = await dbAll(
      `SELECT 
        a.id, a.title, a.date_time, a.location,
        at.name as activity_type,
        ol.name as org_level,
        p.registration_date, p.attendance_status,
        ss.points, ss.bonus_points, ss.penalty_points
      FROM participations p
      JOIN activities a ON p.activity_id = a.id
      LEFT JOIN activity_types at ON a.activity_type_id = at.id
      LEFT JOIN organization_levels ol ON a.organization_level_id = ol.id
      LEFT JOIN student_scores ss ON ss.activity_id = a.id AND ss.student_id = p.student_id
      WHERE p.student_id = ?
      ORDER BY a.date_time DESC
      LIMIT 50`,
      [studentId]
    );

    // Lấy danh sách khen thưởng
    const awards = await dbAll(
      `SELECT 
        sa.id,
        at.name as award_type,
        sa.reason,
        sa.awarded_at as awarded_date,
        sa.awarded_by,
        u.name as awarded_by_name
      FROM student_awards sa
      LEFT JOIN award_types at ON sa.award_type_id = at.id
      LEFT JOIN users u ON sa.awarded_by = u.id
      WHERE sa.student_id = ?
      ORDER BY sa.awarded_at DESC`,
      [studentId]
    );

    // Lấy thống kê theo tháng (6 tháng gần nhất)
    const monthlyStats = await dbAll(
      `SELECT 
        strftime('%Y-%m', a.date_time) as month,
        COUNT(DISTINCT p.activity_id) as activity_count,
        COUNT(CASE WHEN p.attendance_status = 'attended' THEN 1 END) as attended_count,
        COALESCE(SUM(ss.points), 0) as points_earned
      FROM participations p
      JOIN activities a ON p.activity_id = a.id
      LEFT JOIN student_scores ss ON ss.activity_id = a.id AND ss.student_id = p.student_id
      WHERE p.student_id = ? AND a.date_time >= date('now', '-6 months')
      GROUP BY strftime('%Y-%m', a.date_time)
      ORDER BY month DESC`,
      [studentId]
    );

    // Lấy ghi chú (nếu có bảng student_notes)
    let notes = [];
    try {
      notes = await dbAll(
        `SELECT 
          sn.id, sn.content, sn.created_at, sn.created_by,
          u.name as created_by_name
        FROM student_notes sn
        LEFT JOIN users u ON sn.created_by = u.id
        WHERE sn.student_id = ?
        ORDER BY sn.created_at DESC
        LIMIT 20`,
        [studentId]
      );
    } catch (e) {
      // Bảng chưa tồn tại
    }

    // Tính toán stats
    const stats = {
      total_activities: activities.length,
      attended_count: activities.filter((a) => a.attendance_status === 'attended').length,
      total_points: scoreData?.total_points || 0,
      class_rank: scoreData?.class_rank || 0,
      awards_count: awards.length,
    };

    return successResponse({
      student: {
        ...student,
        stats,
      },
      activities,
      awards,
      monthlyStats,
      notes,
    });
  } catch (error: any) {
    console.error('Get student profile error:', error);
    return errorResponse(
      ApiError.internalError('Lỗi khi lấy thông tin học viên', { details: error?.message })
    );
  }
}
