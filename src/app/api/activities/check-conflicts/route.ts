import { NextRequest } from 'next/server';
import { dbAll } from '@/lib/database';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import { requireAuth } from '@/lib/guards';
import {
  extractScopedClassIds,
  findClassScheduleConflicts,
  resolveActivityTimeWindow,
} from '@/lib/activity-schedule-conflicts';

interface ConflictCheckRequest {
  location?: string;
  date_time: string;
  end_time?: string;
  duration?: number;
  class_ids?: number[];
  mandatory_class_ids?: number[];
  voluntary_class_ids?: number[];
  applies_to_all_students?: boolean;
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

// POST /api/activities/check-conflicts
// Check location conflicts, class-schedule conflicts, and teacher schedule warnings.
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
    const { location, date_time, end_time, duration, exclude_activity_id } = body;

    if (!date_time) {
      return errorResponse(ApiError.validation('date_time là bắt buộc'));
    }

    const selectedClassIds = extractScopedClassIds({
      class_ids: body.class_ids,
      mandatory_class_ids: body.mandatory_class_ids,
      voluntary_class_ids: body.voluntary_class_ids,
      applies_to_all_students: body.applies_to_all_students,
    });

    if (!location?.trim() && selectedClassIds.length === 0) {
      return errorResponse(
        ApiError.validation('Cần cung cấp location hoặc class scope để kiểm tra xung đột')
      );
    }

    const timeWindow = resolveActivityTimeWindow({
      dateTime: date_time,
      endTime: end_time,
      durationMinutes: duration,
    });
    if (!timeWindow) {
      return errorResponse(ApiError.validation('date_time không hợp lệ'));
    }

    const locationConflicts = location?.trim()
      ? ((await dbAll(
          `
          SELECT
            a.id as activity_id,
            a.title,
            a.date_time,
            a.location,
            u.name as teacher_name,
            CAST(
              (
                MIN(julianday(COALESCE(a.end_time, datetime(a.date_time, '+120 minutes'))), julianday(?))
                - MAX(julianday(a.date_time), julianday(?))
              ) * 24 * 60
              AS INTEGER
            ) as overlap_minutes
          FROM activities a
          LEFT JOIN users u ON a.teacher_id = u.id
          WHERE a.location = ?
            AND a.status = 'published'
            AND a.id != ?
            AND datetime(a.date_time) < datetime(?)
            AND datetime(COALESCE(a.end_time, datetime(a.date_time, '+120 minutes'))) > datetime(?)
        `,
          [
            timeWindow.end_time,
            timeWindow.start_time,
            location.trim(),
            exclude_activity_id || -1,
            timeWindow.end_time,
            timeWindow.start_time,
          ]
        )) as ConflictActivity[])
      : [];

    const classConflictResult =
      selectedClassIds.length > 0
        ? await findClassScheduleConflicts({
            classIds: selectedClassIds,
            dateTime: date_time,
            endTime: end_time,
            durationMinutes: duration,
            excludeActivityId: exclude_activity_id,
          })
        : { conflicts: [], window: timeWindow };

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
        AND a.status = 'published'
        AND a.id != ?
        AND ABS((julianday(a.date_time) - julianday(?)) * 24) < 3
      ORDER BY time_diff_minutes ASC
      LIMIT 3
    `,
      [timeWindow.start_time, user.id, exclude_activity_id || -1, timeWindow.start_time]
    )) as any[];

    return successResponse({
      has_location_conflict: locationConflicts.length > 0,
      location_conflicts: locationConflicts,
      has_class_schedule_conflict: classConflictResult.conflicts.length > 0,
      class_schedule_conflicts: classConflictResult.conflicts,
      has_schedule_warning: teacherConflicts.length > 0,
      schedule_warnings: teacherConflicts,
      summary: {
        location: location?.trim() || null,
        selected_class_count: selectedClassIds.length,
        date_time: timeWindow.start_time,
        end_time: timeWindow.end_time,
        duration_minutes: timeWindow.duration_minutes,
        total_conflicts: locationConflicts.length + classConflictResult.conflicts.length,
        total_warnings: teacherConflicts.length,
      },
    });
  } catch (error: any) {
    console.error('Lỗi kiểm tra xung đột:', error);
    return errorResponse(ApiError.internalError('Lỗi máy chủ'));
  }
}
