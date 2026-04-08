import { NextRequest, NextResponse } from 'next/server';
import { dbAll } from '@/lib/database';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import { requireAuth } from '@/lib/guards';

interface ConflictCheckRequest {
  location: string;
  date_time: string;
  duration?: number; // Minutes (default: 120)
  exclude_activity_id?: number;
}

interface ConflictActivity {
  activity_id: number;
  title: string;
  teacher_name: string;
  date_time: string;
  location: string;
  overlap_minutes: number;
}

/**
 * POST /api/activities/check-conflicts
 *
 * Kiểm tra xung đột địa điểm và thời gian khi tạo/sửa hoạt động
 *
 * Business Rules:
 * 1. KHÔNG được 2 hoạt động cùng địa điểm trong cùng khung giờ
 * 2. Cảnh báo nếu teacher có hoạt động khác gần thời điểm này (±2h)
 */
export async function POST(request: NextRequest) {
  try {
    let user;
    try {
      user = await requireAuth(request);
    } catch {
      return errorResponse(ApiError.unauthorized('Chưa đăng nhập'));
    }

    if (user.role !== 'teacher' && user.role !== 'admin') {
      return errorResponse(ApiError.forbidden('Không có quyền truy cập'));
    }

    const body: ConflictCheckRequest = await request.json();
    const { location, date_time, duration = 120, exclude_activity_id } = body;

    if (!location || !date_time) {
      return errorResponse(ApiError.validation('Location và date_time là bắt buộc'));
    }

    // Parse datetime
    const startTime = new Date(date_time);
    if (isNaN(startTime.getTime())) {
      return errorResponse(ApiError.validation('date_time không hợp lệ'));
    }

    const endTime = new Date(startTime.getTime() + duration * 60000);

    // 1. Check location conflicts
    const locationConflicts = (await dbAll(
      `
      SELECT 
        a.id as activity_id,
        a.title,
        a.date_time,
        a.location,
        u.name as teacher_name,
        120 as overlap_minutes
      FROM activities a
      LEFT JOIN users u ON a.teacher_id = u.id
      WHERE a.location = ?
      AND a.status IN ('published', 'pending')
      AND a.id != ?
      AND (
        -- Overlap detection: [start1, end1] overlaps [start2, end2]
        -- Case 1: New activity starts during existing activity
        datetime(?) BETWEEN datetime(a.date_time) AND datetime(a.date_time, '+' || ? || ' minutes')
        OR
        -- Case 2: New activity ends during existing activity  
        datetime(?) BETWEEN datetime(a.date_time) AND datetime(a.date_time, '+' || ? || ' minutes')
        OR
        -- Case 3: Existing activity is completely within new activity
        (
          datetime(a.date_time) >= datetime(?)
          AND datetime(a.date_time, '+' || ? || ' minutes') <= datetime(?)
        )
      )
    `,
      [
        location,
        exclude_activity_id || -1,
        startTime.toISOString(),
        duration,
        endTime.toISOString(),
        duration,
        startTime.toISOString(),
        duration,
        endTime.toISOString(),
      ]
    )) as ConflictActivity[];

    // 2. Check teacher schedule conflicts (warning only, not blocking)
    const teacherConflicts = (await dbAll(
      `
      SELECT 
        a.id as activity_id,
        a.title,
        a.date_time,
        a.location,
        u.name as teacher_name,
        CAST(ABS((julianday(a.date_time) - julianday(?)) * 24 * 60) AS INTEGER) as time_diff_minutes
      FROM activities a
      LEFT JOIN users u ON a.teacher_id = u.id
      WHERE a.teacher_id = ?
      AND a.status IN ('published', 'pending')
      AND a.id != ?
      AND ABS((julianday(a.date_time) - julianday(?)) * 24) < 3  -- Within 3 hours
      ORDER BY time_diff_minutes ASC
      LIMIT 3
    `,
      [startTime.toISOString(), user.id, exclude_activity_id || -1, startTime.toISOString()]
    )) as any[];

    return successResponse({
      has_location_conflict: locationConflicts.length > 0,
      location_conflicts: locationConflicts,
      has_schedule_warning: teacherConflicts.length > 0,
      schedule_warnings: teacherConflicts,
      summary: {
        location: location,
        date_time: startTime.toISOString(),
        duration_minutes: duration,
        total_conflicts: locationConflicts.length,
        total_warnings: teacherConflicts.length,
      },
    });
  } catch (error: any) {
    console.error('Lỗi kiểm tra xung đột:', error);
    return errorResponse(ApiError.internalError('Lỗi máy chủ'));
  }
}
