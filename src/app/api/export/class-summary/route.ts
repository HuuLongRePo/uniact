/**
 * API Route: Export Class Summary to CSV
 * GET /api/export/class-summary?class_id=X
 *
 * Returns CSV with student scores, rankings, and alert levels for a class
 */

import { NextRequest, NextResponse } from 'next/server';
import { dbAll, dbGet, dbReady } from '@/lib/database';
import { getUserFromRequest } from '@/lib/guards';
import { PointCalculationService } from '@/lib/scoring';
import Papa from 'papaparse';
import { ApiError, errorResponse } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    await dbReady();

    const user = await getUserFromRequest(request);
    if (!user) {
      return errorResponse(ApiError.unauthorized('Unauthorized'));
    }

    // Permission check
    if (!['admin', 'teacher'].includes(user.role)) {
      return errorResponse(ApiError.forbidden('Không có quyền xuất dữ liệu'));
    }

    const classId = request.nextUrl.searchParams.get('class_id');
    if (!classId) {
      return errorResponse(ApiError.validation('Thiếu class_id'));
    }

    // Get class details
    const classInfo = (await dbGet('SELECT * FROM classes WHERE id = ?', [
      parseInt(classId),
    ])) as any;

    if (!classInfo) {
      return errorResponse(ApiError.notFound('Không tìm thấy lớp'));
    }

    // Teachers can only export their assigned classes
    if (user.role === 'teacher') {
      const isAssigned = await dbGet(
        'SELECT * FROM class_teachers WHERE class_id = ? AND teacher_id = ?',
        [parseInt(classId), user.id]
      );

      if (!isAssigned) {
        return errorResponse(ApiError.forbidden('Bạn chỉ có thể xuất dữ liệu lớp mình phụ trách'));
      }
    }

    // Get all students in class
    const students = (await dbAll(
      'SELECT id, name, email FROM users WHERE class_id = ? AND role = "student" ORDER BY name',
      [parseInt(classId)]
    )) as any[];

    if (students.length === 0) {
      return errorResponse(ApiError.notFound('Lớp chưa có học viên'));
    }

    // Calculate scores for each student
    const pointService = new PointCalculationService();
    const studentScores = await Promise.all(
      students.map(async (student) => {
        // Get total score from database instead of calculateStudentScore
        const scoreResult = (await dbGet(
          'SELECT COALESCE(SUM(points), 0) as total FROM student_scores WHERE student_id = ?',
          [student.id]
        )) as any;
        const totalScore = scoreResult?.total || 0;

        // Get activity counts
        const stats = (await dbGet(
          `
          SELECT 
            COUNT(CASE WHEN attendance_status = 'attended' THEN 1 END) as attended,
            COUNT(CASE WHEN achievement_level = 'excellent' THEN 1 END) as excellent,
            COUNT(CASE WHEN achievement_level = 'good' THEN 1 END) as good
          FROM participations
          WHERE student_id = ?
        `,
          [student.id]
        )) as any;

        return {
          id: student.id,
          name: student.name,
          email: student.email,
          total_score: totalScore,
          attended_count: stats?.attended || 0,
          excellent_count: stats?.excellent || 0,
          good_count: stats?.good || 0,
          alert_level: getAlertLevel(totalScore),
        };
      })
    );

    // Sort by score descending for ranking
    studentScores.sort((a, b) => b.total_score - a.total_score);

    // Format data for CSV
    const csvData = studentScores.map((s, index) => ({
      Hạng: index + 1,
      'Mã Sinh Viên': s.id,
      'Họ và Tên': s.name,
      Email: s.email,
      'Tổng Điểm': s.total_score,
      'Số Hoạt Động Tham Gia': s.attended_count,
      'Số Lần Xuất Sắc': s.excellent_count,
      'Số Lần Tốt': s.good_count,
      'Mức Cảnh Báo': s.alert_level.label,
      'Trạng Thái': s.alert_level.status,
    }));

    // Generate CSV
    const csv = Papa.unparse(csvData, {
      delimiter: ',',
      header: true,
    });

    // Add BOM for Excel UTF-8 support
    const csvWithBOM = '\uFEFF' + csv;

    // Return CSV file
    return new NextResponse(csvWithBOM, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="class-${classId}-summary-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error: any) {
    console.error('Export class summary error:', error);
    return errorResponse(ApiError.internalError('Lỗi server', { details: error.message }));
  }
}

function getAlertLevel(score: number): { level: string; label: string; status: string } {
  if (score >= 80) {
    return { level: 'green', label: 'Xanh', status: 'Xuất sắc' };
  } else if (score >= 60) {
    return { level: 'yellow', label: 'Vàng', status: 'Khá' };
  } else if (score >= 40) {
    return { level: 'orange', label: 'Cam', status: 'Trung bình' };
  } else {
    return { level: 'red', label: 'Đỏ', status: 'Yếu' };
  }
}
