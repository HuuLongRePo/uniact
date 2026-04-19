/**
 * API Route: Giảng viên đánh giá học viên
 * POST /api/teacher/evaluate
 *
 * Cho phép giảng viên đánh giá mức độ đạt được của học viên
 * Cập nhật: evaluated_at, evaluated_by, achievement_level
 */

import { NextRequest } from 'next/server';
import { dbGet, dbRun, dbReady, dbHelpers } from '@/lib/database';
import { PointCalculationService } from '@/lib/scoring';
import { requireApiRole } from '@/lib/guards';
import { ApiError, successResponse, errorResponse } from '@/lib/api-response';
import { teacherCanAccessActivity } from '@/lib/activity-access';

export async function POST(request: NextRequest) {
  try {
    await dbReady();

    const user = await requireApiRole(request, ['teacher', 'admin']);

    const { participation_id, achievement_level, feedback } = await request.json();

    if (!participation_id || !achievement_level) {
      return errorResponse(ApiError.validation('Thiếu participation_id hoặc achievement_level'));
    }

    // Kiểm tra achievement_level
    const validLevels = ['excellent', 'good', 'participated'];
    if (!validLevels.includes(achievement_level)) {
      return errorResponse(
        ApiError.validation(
          'achievement_level không hợp lệ. Phải là: excellent, good, hoặc participated'
        )
      );
    }

    // Lấy thông tin tham gia
    const participation = (await dbGet(
      `
      SELECT 
        p.*,
        a.id as activity_id,
        a.title as activity_title,
        a.teacher_id,
        s.id as student_id,
        s.name as student_name,
        s.class_id
      FROM participations p
      JOIN activities a ON p.activity_id = a.id
      JOIN users s ON p.student_id = s.id
      WHERE p.id = ?
    `,
      [participation_id]
    )) as any;

    if (!participation) {
      return errorResponse(ApiError.notFound('Không tìm thấy bản ghi tham gia'));
    }

    // Chỉ cho phép đánh giá khi đã điểm danh tham gia
    if (participation.attendance_status !== 'attended') {
      return errorResponse(
        ApiError.validation('Chỉ có thể đánh giá những học viên đã điểm danh tham gia')
      );
    }

    // Teacher được phép đánh giá nếu có activity-scoped access, admin có quyền can thiệp toàn cục.
    if (
      user.role === 'teacher' &&
      !(await teacherCanAccessActivity(Number(user.id), Number(participation.activity_id)))
    ) {
      return errorResponse(
        ApiError.forbidden('Bạn chỉ có thể đánh giá người tham gia của hoạt động thuộc phạm vi quản lý')
      );
    }

    // Cập nhật đánh giá
    await dbRun(
      `
      UPDATE participations 
      SET 
        achievement_level = ?,
        feedback = ?,
        evaluated_by = ?,
        evaluated_at = datetime('now'),
        updated_at = datetime('now')
      WHERE id = ?
    `,
      [achievement_level, feedback || null, user.id, participation_id]
    );

    const calculation = await PointCalculationService.autoCalculateAfterEvaluation(
      Number(participation_id)
    );

    // Tạo audit log
    await dbHelpers.createAuditLog(
      user.id,
      'EVALUATE',
      'participations',
      participation_id,
      JSON.stringify({
        student_id: participation.student_id,
        student_name: participation.student_name,
        activity_id: participation.activity_id,
        activity_title: participation.activity_title,
        achievement_level,
        feedback: feedback || null,
      })
    );

    // Tạo thông báo cho học viên
    await dbRun(
      `
      INSERT INTO alerts (level, message, related_table, related_id, is_read, created_at)
      VALUES (?, ?, ?, ?, 0, datetime('now'))
    `,
      [
        'info',
        `Giảng viên ${user.name} đã đánh giá kết quả của bạn cho hoạt động "${participation.activity_title}": ${getAchievementLabel(achievement_level)}`,
        'participations',
        participation_id,
      ]
    );

    return successResponse(
      {
        participation_id,
        student_name: participation.student_name,
        activity_title: participation.activity_title,
        achievement_level,
        achievement_label: getAchievementLabel(achievement_level),
        evaluated_by: user.name,
        evaluated_at: new Date().toISOString(),
        points: calculation.totalPoints,
        formula: calculation.formula,
      },
      'Đánh giá thành công'
    );
  } catch (error: any) {
    console.error('Teacher evaluate error:', error);
    return errorResponse(
      error instanceof ApiError ||
        (error && typeof error.status === 'number' && typeof error.code === 'string')
        ? error
        : ApiError.internalError('Lỗi server', { details: error?.message })
    );
  }
}

function getAchievementLabel(level: string): string {
  const labels: Record<string, string> = {
    excellent: 'Xuất sắc',
    good: 'Tốt',
    participated: 'Tham gia',
  };
  return labels[level] || level;
}
