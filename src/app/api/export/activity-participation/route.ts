/**
 * API Route: Export Activity Participation to CSV
 * GET /api/export/activity-participation?activity_id=X
 *
 * Returns CSV file with list of participants, attendance status, and achievement level
 */

import { NextRequest, NextResponse } from 'next/server';
import { dbAll, dbGet, dbReady } from '@/lib/database';
import { getUserFromRequest } from '@/lib/guards';
import Papa from 'papaparse';
import { ApiError, errorResponse } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    await dbReady();

    const user = await getUserFromRequest(request);
    if (!user) {
      return errorResponse(ApiError.unauthorized('Chưa đăng nhập'));
    }

    // Only teachers and admins can export
    if (!['teacher', 'admin'].includes(user.role)) {
      return errorResponse(ApiError.forbidden('Không có quyền xuất dữ liệu'));
    }

    const activityId = request.nextUrl.searchParams.get('activity_id');
    if (!activityId) {
      return errorResponse(ApiError.validation('Thiếu activity_id'));
    }

    // Get activity details
    const activity = (await dbGet('SELECT * FROM activities WHERE id = ?', [
      parseInt(activityId),
    ])) as any;

    if (!activity) {
      return errorResponse(ApiError.notFound('Không tìm thấy hoạt động'));
    }

    // Teachers can only export their own activities
    if (user.role === 'teacher' && activity.teacher_id !== user.id) {
      return errorResponse(ApiError.forbidden('Bạn chỉ có thể xuất dữ liệu hoạt động của mình'));
    }

    // Get participants
    const participants = await dbAll(
      `
      SELECT 
        u.id as student_id,
        u.name as student_name,
        u.email,
        c.name as class_name,
        p.attendance_status,
        p.achievement_level,
        p.feedback,
        p.created_at as registered_at,
        p.evaluated_at,
        COALESCE(ss.points, 0) as points,
        ev.name as evaluated_by_name
      FROM participations p
      JOIN users u ON p.student_id = u.id
      LEFT JOIN classes c ON u.class_id = c.id
      LEFT JOIN student_scores ss ON ss.student_id = p.student_id AND ss.activity_id = p.activity_id
      LEFT JOIN users ev ON p.evaluated_by = ev.id
      WHERE p.activity_id = ?
      ORDER BY c.name, u.name
    `,
      [parseInt(activityId)]
    );

    if (participants.length === 0) {
      return errorResponse(ApiError.notFound('Chưa có học viên đăng ký hoạt động này'));
    }

    // Format data for CSV
    const csvData = participants.map((p: any, index: number) => ({
      STT: index + 1,
      'Mã Sinh Viên': p.student_id,
      'Họ và Tên': p.student_name,
      Email: p.email,
      Lớp: p.class_name || '',
      'Trạng Thái': getAttendanceLabel(p.attendance_status),
      'Đánh Giá': getAchievementLabel(p.achievement_level),
      Điểm: p.points,
      'Nhận Xét': p.feedback || '',
      'Ngày Đăng Ký': formatDate(p.registered_at),
      'Người Đánh Giá': p.evaluated_by_name || '',
      'Ngày Đánh Giá': formatDate(p.evaluated_at),
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
        'Content-Disposition': `attachment; filename="activity-${activityId}-participants-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error: any) {
    console.error('Export activity participation error:', error);
    return errorResponse(ApiError.internalError('Lỗi server', { details: error.message }));
  }
}

function getAttendanceLabel(status: string): string {
  const labels: Record<string, string> = {
    registered: 'Đã đăng ký',
    attended: 'Đã tham gia',
    absent: 'Vắng mặt',
  };
  return labels[status] || status;
}

function getAchievementLabel(level: string | null): string {
  if (!level) return 'Chưa đánh giá';

  const labels: Record<string, string> = {
    excellent: 'Xuất sắc',
    good: 'Tốt',
    participated: 'Tham gia',
  };
  return labels[level] || level;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleString('vi-VN');
  } catch {
    return dateStr;
  }
}
