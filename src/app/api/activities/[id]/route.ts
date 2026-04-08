import { NextRequest } from 'next/server';
import { requireApiAuth, requireApiRole } from '@/lib/guards';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import { dbHelpers, dbRun, dbAll, dbGet } from '@/lib/database';
import { cache } from '@/lib/cache';
import { validateUpdateActivityBody } from '@/lib/activity-validation';
import { validateTransition, type ActivityStatus } from '@/lib/activity-workflow';

type ActivityDetailRecord = {
  id: number;
  title: string;
  description: string | null;
  date_time: string;
  location: string;
  teacher_id: number;
  max_participants: number | null;
  status: string;
  approval_status: string;
  registration_deadline: string | null;
  activity_type_id: number | null;
  organization_level_id: number | null;
  base_points: number | null;
  qr_enabled: number | boolean | null;
  teacher_name: string | null;
  activity_type: string | null;
  organization_level: string | null;
  activity_type_base_points: number | string | null;
  participant_count: number | string | null;
  available_slots: number | string | null;
  is_registered: number | string | boolean | null;
  registration_status: string | null;
};

function normalizeActivityDetail(activity: ActivityDetailRecord) {
  const participantCount = Number(activity.participant_count || 0);
  const maxParticipants =
    activity.max_participants === null ? null : Number(activity.max_participants || 0);
  const fallbackSlots =
    maxParticipants === null ? null : Math.max(0, maxParticipants - participantCount);
  const rawBasePoints = Number(activity.base_points || 0);
  const typeBasePoints = Number(activity.activity_type_base_points || 0);
  const resolvedBasePoints = rawBasePoints > 0 ? rawBasePoints : typeBasePoints;
  const startTime = new Date(activity.date_time).getTime();
  const now = Date.now();
  const deadlineTime = activity.registration_deadline
    ? new Date(activity.registration_deadline).getTime()
    : null;
  const isRegistered = Boolean(Number(activity.is_registered || 0));
  const isStarted = !Number.isNaN(startTime) && now >= startTime;
  const isRegistrationClosed =
    deadlineTime !== null && !Number.isNaN(deadlineTime) ? now >= deadlineTime : false;
  const isFull = maxParticipants !== null && participantCount >= maxParticipants;

  return {
    ...activity,
    id: Number(activity.id),
    description: activity.description || '',
    max_participants: maxParticipants,
    status: activity.status,
    activity_status: activity.status,
    teacher_name: activity.teacher_name || 'Chưa phân công',
    activity_type: activity.activity_type || null,
    organization_level: activity.organization_level || null,
    base_points: resolvedBasePoints,
    participant_count: participantCount,
    available_slots:
      maxParticipants === null
        ? null
        : Math.max(0, Number(activity.available_slots ?? fallbackSlots ?? 0)),
    is_registered: isRegistered,
    registration_status: activity.registration_status || null,
    registration_deadline: activity.registration_deadline,
    qr_enabled: Boolean(activity.qr_enabled),
    can_register:
      !isRegistered &&
      activity.status === 'published' &&
      !isStarted &&
      !isRegistrationClosed &&
      !isFull,
    can_cancel:
      isRegistered &&
      activity.registration_status === 'registered' &&
      !Number.isNaN(startTime) &&
      (startTime - now) / (1000 * 60 * 60) >= 24,
  };
}

// PUT /api/activities/:id - Update activity
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiRole(request, ['teacher', 'admin']);

    const { id } = await params;
    const activityId = Number(id);
    if (!activityId || Number.isNaN(activityId)) {
      return errorResponse(ApiError.validation('ID hoạt động không hợp lệ'));
    }

    const existingActivity = await dbHelpers.getActivityById(activityId);
    if (!existingActivity) {
      return errorResponse(ApiError.notFound('Không tìm thấy hoạt động'));
    }

    if (user.role === 'teacher' && Number(existingActivity.teacher_id) !== Number(user.id)) {
      return errorResponse(ApiError.forbidden('Bạn chỉ được chỉnh sửa hoạt động do mình tạo'));
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse(ApiError.badRequest('Dữ liệu JSON không hợp lệ'));
    }

    const validation = validateUpdateActivityBody(body, {
      baseDateTime:
        typeof existingActivity.date_time === 'string' ? existingActivity.date_time : null,
    });
    if (!validation.data) {
      return errorResponse(
        ApiError.validation('Dữ liệu cập nhật hoạt động không hợp lệ', validation.errors)
      );
    }

    const requestBody = body as Record<string, unknown>;
    const updatePayload: Record<string, unknown> = { ...validation.data };

    if (Object.prototype.hasOwnProperty.call(requestBody, 'status')) {
      const rawStatus = requestBody.status;
      const allowedStatuses = new Set(['draft', 'published', 'cancelled', 'completed']);

      if (typeof rawStatus !== 'string' || !rawStatus.trim()) {
        return errorResponse(
          ApiError.validation('Dữ liệu cập nhật hoạt động không hợp lệ', {
            status: 'Trạng thái không hợp lệ',
          })
        );
      }

      const statusValue = rawStatus.trim();
      if (!allowedStatuses.has(statusValue)) {
        return errorResponse(
          ApiError.validation('Dữ liệu cập nhật hoạt động không hợp lệ', {
            status: 'Trạng thái không hợp lệ',
          })
        );
      }

      const statusTransition = validateTransition(
        existingActivity.status as ActivityStatus,
        statusValue as ActivityStatus,
        user.role as 'admin' | 'teacher' | 'student',
        existingActivity
      );

      if (!statusTransition.valid) {
        return errorResponse(
          ApiError.validation('Dữ liệu cập nhật hoạt động không hợp lệ', {
            status: statusTransition.error || 'Không thể chuyển trạng thái theo workflow',
          })
        );
      }

      updatePayload.status = statusValue;
    }

    if (Array.isArray(updatePayload.class_ids) && updatePayload.class_ids.length > 0) {
      const classes = (await dbHelpers.getAllClasses()) as Array<{ id: number }>;
      const validClassIds = new Set((classes || []).map((item) => Number(item.id)));
      const invalidClassIds = updatePayload.class_ids.filter(
        (classId) => !validClassIds.has(Number(classId))
      );

      if (invalidClassIds.length > 0) {
        return errorResponse(
          ApiError.validation('Lớp được chọn không hợp lệ', {
            class_ids: `ID lớp không tồn tại: ${invalidClassIds.join(', ')}`,
          })
        );
      }
    }

    if (typeof updatePayload.max_participants === 'number') {
      const participantRows = (await dbAll(
        `SELECT COUNT(*) as count
         FROM participations
         WHERE activity_id = ? AND attendance_status IN ('registered', 'attended')`,
        [activityId]
      )) as Array<{ count: number }>;

      const currentRegistered = Number(participantRows?.[0]?.count || 0);
      if (updatePayload.max_participants < currentRegistered) {
        return errorResponse(
          ApiError.validation('Dữ liệu cập nhật hoạt động không hợp lệ', {
            max_participants:
              'Không thể giảm số lượng tối đa nhỏ hơn số lượng học viên đã đăng ký hiện tại',
          })
        );
      }
    }

    if (Object.keys(updatePayload).length === 0) {
      return errorResponse(ApiError.validation('Không có thay đổi nào'));
    }

    const result = await dbHelpers.updateActivity(activityId, updatePayload);

    if (result.changes === 0) {
      return errorResponse(ApiError.validation('Không có thay đổi nào'));
    }

    cache.invalidatePrefix('activities:');

    await dbHelpers.createAuditLog(
      user.id,
      'update_activity',
      'activities',
      activityId,
      JSON.stringify({ changes: Object.keys(updatePayload) })
    );

    const updatedActivity = await dbHelpers.getActivityById(activityId);

    try {
      if (updatePayload.status === 'cancelled' && existingActivity.status !== 'cancelled') {
        const participants = await dbAll('SELECT student_id FROM participations WHERE activity_id = ?', [
          activityId,
        ]);
        if (participants && Array.isArray(participants) && participants.length > 0) {
          for (const p of participants) {
            if (p.student_id) {
              await dbRun(
                `INSERT INTO notifications (user_id, type, title, message, related_table, related_id, is_read, created_at)
                 VALUES (?, 'activity_update', ?, ?, 'activities', ?, 0, datetime('now'))`,
                [
                  p.student_id,
                  'Hoạt động đã hủy',
                  `Hoạt động "${existingActivity.title}" đã bị hủy.`,
                  activityId,
                ]
              );
            }
          }
        }
      }
    } catch (cancelNotifyErr) {
      console.error('Cancel activity notification error:', cancelNotifyErr);
    }

    return successResponse({ activity: updatedActivity }, 'Cập nhật hoạt động thành công', 200);
  } catch (error: any) {
    console.error('Update activity error:', error);
    return errorResponse(ApiError.internalError('Lỗi máy chủ nội bộ'));
  }
}

// GET /api/activities/:id - Get single activity
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiAuth(request);

    const { id } = await params;
    const activityId = Number(id);
    if (!activityId || Number.isNaN(activityId)) {
      return errorResponse(ApiError.validation('ID hoạt động không hợp lệ'));
    }

    const studentId = user.role === 'student' ? Number(user.id) : -1;
    const activity = (await dbGet(
      `SELECT
         a.*,
         u.name as teacher_name,
         at.name as activity_type,
         at.base_points as activity_type_base_points,
         ol.name as organization_level,
         (
           SELECT COUNT(*)
           FROM participations
           WHERE activity_id = a.id AND attendance_status IN ('registered', 'attended')
         ) as participant_count,
         CASE
           WHEN a.max_participants IS NULL THEN NULL
           ELSE a.max_participants - (
             SELECT COUNT(*)
             FROM participations
             WHERE activity_id = a.id AND attendance_status IN ('registered', 'attended')
           )
         END as available_slots,
         CASE
           WHEN p.id IS NOT NULL THEN 1
           ELSE 0
         END as is_registered,
         p.attendance_status as registration_status
       FROM activities a
       LEFT JOIN users u ON u.id = a.teacher_id
       LEFT JOIN activity_types at ON at.id = a.activity_type_id
       LEFT JOIN organization_levels ol ON ol.id = a.organization_level_id
       LEFT JOIN participations p ON p.activity_id = a.id AND p.student_id = ?
       WHERE a.id = ?`,
      [studentId, activityId]
    )) as ActivityDetailRecord | undefined;

    if (!activity) {
      return errorResponse(ApiError.notFound('Không tìm thấy hoạt động'));
    }

    const classRows = (await dbAll(
      `SELECT ac.class_id, c.name
       FROM activity_classes ac
       LEFT JOIN classes c ON c.id = ac.class_id
       WHERE ac.activity_id = ?`,
      [activityId]
    )) as Array<{ class_id: number; name?: string | null }>;

    const normalizedActivity = normalizeActivityDetail(activity) as ActivityDetailRecord & {
      class_ids?: number[];
      class_names?: string[];
      classes?: Array<{ id: number; name: string | null }>;
    };

    normalizedActivity.class_ids = classRows.map((row) => row.class_id);
    normalizedActivity.class_names = classRows.map((row) => row.name).filter(Boolean) as string[];
    normalizedActivity.classes = classRows.map((row) => ({
      id: row.class_id,
      name: row.name || null,
    }));

    if (user.role === 'teacher' && Number(normalizedActivity.teacher_id) !== Number(user.id)) {
      return errorResponse(ApiError.forbidden('Bạn chỉ được xem hoạt động do mình tạo'));
    }

    return successResponse({ activity: normalizedActivity }, undefined, 200);
  } catch (error: any) {
    console.error('Get activity error:', error);
    return errorResponse(ApiError.internalError('Lỗi máy chủ nội bộ'));
  }
}

// DELETE /api/activities/:id - Delete activity
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireApiRole(request, ['teacher', 'admin']);

    const { id } = await params;
    const activityId = Number(id);
    if (!activityId || Number.isNaN(activityId)) {
      return errorResponse(ApiError.validation('ID hoạt động không hợp lệ'));
    }

    const activity = await dbHelpers.getActivityById(activityId);
    if (!activity) {
      return errorResponse(ApiError.notFound('Không tìm thấy hoạt động'));
    }

    if (user.role === 'teacher' && Number(activity.teacher_id) !== Number(user.id)) {
      return errorResponse(ApiError.forbidden('Bạn chỉ được xóa hoạt động do mình tạo'));
    }

    await dbRun('UPDATE activities SET status = ?, updated_at = datetime("now") WHERE id = ?', [
      'cancelled',
      activityId,
    ]);

    cache.invalidatePrefix('activities:');

    await dbHelpers.createAuditLog(
      user.id,
      'delete_activity',
      'activities',
      activityId,
      JSON.stringify({ title: activity.title })
    );

    try {
      const participants = await dbAll('SELECT student_id FROM participations WHERE activity_id = ?', [
        activityId,
      ]);
      if (participants && Array.isArray(participants) && participants.length > 0) {
        for (const p of participants) {
          if (p.student_id) {
            await dbRun(
              `INSERT INTO notifications (user_id, type, title, message, related_table, related_id, is_read, created_at)
               VALUES (?, 'activity_update', ?, ?, 'activities', ?, 0, datetime('now'))`,
              [
                p.student_id,
                'Hoạt động đã bị xóa',
                `Hoạt động "${activity.title}" đã bị xóa.`,
                activityId,
              ]
            );
          }
        }
      }
    } catch (notifyErr) {
      console.error('Delete activity notification error:', notifyErr);
    }

    return successResponse({ ok: true }, 'Xóa hoạt động thành công', 200);
  } catch (error: any) {
    console.error('Delete activity error:', error);
    return errorResponse(ApiError.internalError('Lỗi máy chủ nội bộ'));
  }
}
