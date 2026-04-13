import { NextRequest } from 'next/server';
import {
  dbGet,
  dbRun,
  dbAll,
  dbHelpers,
  ensureActivityClassParticipationMode,
  ensureParticipationColumns,
  withTransaction,
} from '@/lib/database';
import { evaluateRegistrationPolicies } from '@/lib/activity-service';
import { notificationService, ActivityRegistrationNotification } from '@/lib/notifications';
import { requireApiRole } from '@/lib/guards';
import { rateLimit } from '@/lib/rateLimit';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

const PARTICIPATION_UNIQUE_CONSTRAINT =
  'UNIQUE constraint failed: participations.activity_id, participations.student_id';

function isParticipationDuplicateError(error: unknown): boolean {
  const message = String((error as any)?.message || '');
  return message.includes(PARTICIPATION_UNIQUE_CONSTRAINT);
}

// POST /api/activities/:id/register - Đăng ký tham gia hoạt động
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = rateLimit(request, 30, 60 * 1000);
    if (!rl.allowed) {
      return errorResponse(
        new ApiError('RATE_LIMITED', 'Bạn gửi yêu cầu đăng ký quá nhanh, vui lòng thử lại sau', 429)
      );
    }

    const user = await requireApiRole(request, ['student']);
    await ensureParticipationColumns();
    await ensureActivityClassParticipationMode();

    // Read request body safely (may be empty for simple POST)
    let forceRegister = false;
    try {
      const requestBody = await request.json();
      forceRegister = requestBody.force_register === true;
    } catch {
      // No body or invalid JSON, use default
    }

    const { id } = await params;
    const activityId = Number(id);
    if (!activityId || Number.isNaN(activityId)) {
      return errorResponse(ApiError.validation('ID hoạt động không hợp lệ'));
    }

    // Kiểm tra hoạt động tồn tại và được published
    const activity = await dbGet('SELECT * FROM activities WHERE id = ?', [activityId]);

    if (!activity) {
      return errorResponse(ApiError.notFound('Không tìm thấy hoạt động'));
    }

    if (activity.status !== 'published') {
      return errorResponse(ApiError.validation('Hoạt động chưa được công bố'));
    }

    const now = new Date();
    const activityStartTime = new Date(activity.date_time);
    if (Number.isNaN(activityStartTime.getTime())) {
      return errorResponse(ApiError.validation('Thời gian hoạt động không hợp lệ'));
    }

    if (now >= activityStartTime) {
      return errorResponse(
        ApiError.validation('Không thể đăng ký hoạt động đã bắt đầu hoặc đã kết thúc')
      );
    }

    // 🔥 Kiểm tra registration_deadline (strict: now < deadline)
    if (activity.registration_deadline) {
      const deadline = new Date(activity.registration_deadline);
      if (Number.isNaN(deadline.getTime())) {
        return errorResponse(ApiError.validation('Hạn đăng ký không hợp lệ'));
      }

      if (now >= deadline) {
        return errorResponse(
          ApiError.validation('Đã hết hạn đăng ký', { deadline: activity.registration_deadline })
        );
      }
    }

    // Kiểm tra học viên có thuộc lớp được mời không (dựa vào bảng activity_classes)
    const rows = (await dbAll('SELECT class_id, participation_mode FROM activity_classes WHERE activity_id = ?', [
      activityId,
    ])) as Array<{ class_id: number; participation_mode?: string | null }>;

    const classIds = rows.map((r) => r.class_id);
    if (classIds.length > 0 && (!user.class_id || !classIds.includes(user.class_id))) {
      return errorResponse(ApiError.forbidden('Hoạt động không dành cho lớp của bạn'));
    }

    // Kiểm tra đã đăng ký chưa
    const existingRegistration = await dbGet(
      'SELECT * FROM participations WHERE activity_id = ? AND student_id = ?',
      [activityId, user.id]
    );

    if (existingRegistration) {
      return errorResponse(ApiError.validation('Bạn đã đăng ký hoạt động này rồi'));
    }

    // 🔐 Chính sách đăng ký (giới hạn tuần + xung đột trùng giờ bắt đầu)
    const mandatoryClassMatch =
      !!user.class_id &&
      rows.some(
        (row) =>
          Number(row.class_id) === Number(user.class_id) &&
          (row.participation_mode || 'mandatory') === 'mandatory'
      );

    if (mandatoryClassMatch) {
      return errorResponse(
        ApiError.validation(
          'Hoạt động này áp dụng bắt buộc với lớp của bạn. Bạn không cần tự đăng ký.'
        )
      );
    }

    const policy = await evaluateRegistrationPolicies({
      studentId: user.id,
      activity,
      activityId,
      force: forceRegister,
    });
    if (!policy.ok) {
      if (policy.error === 'conflict_detected') {
        return errorResponse(
          ApiError.conflict('Bạn đã đăng ký hoạt động khác trùng giờ bắt đầu. Xác nhận để tiếp tục.', {
            conflicts: policy.conflicts,
            can_override: policy.can_override,
            hint: 'Gửi lại yêu cầu với {"force_register": true} để bỏ qua cảnh báo trùng giờ bắt đầu',
          })
        );
      }
      return errorResponse(ApiError.validation(policy.error || 'Không thể đăng ký hoạt động'));
    }

    // 🔒 TRANSACTION: Kiểm tra capacity + insert atomically để tránh race condition
    const result = await withTransaction(async () => {
      // Re-check duplicate inside transaction for race safety
      const duplicateInTx = await dbGet(
        'SELECT id FROM participations WHERE activity_id = ? AND student_id = ? LIMIT 1',
        [activityId, user.id]
      );

      if (duplicateInTx) {
        throw new Error('ALREADY_REGISTERED');
      }

      // Kiểm tra còn chỗ không (trong transaction để lock)
      // Chỉ đếm đăng ký còn hiệu lực theo schema hiện tại
      if (typeof activity.max_participants === 'number' && activity.max_participants > 0) {
        const registrationCount = (await dbGet(
          `SELECT COUNT(*) as count FROM participations
           WHERE activity_id = ? AND attendance_status IN ('registered', 'attended')`,
          [activityId]
        )) as { count: number };

        if (Number(registrationCount?.count || 0) >= activity.max_participants) {
          throw new Error('CAPACITY_FULL');
        }
      }

      // Tạo đăng ký
      const insertResult = await dbRun(
        `INSERT INTO participations (
           activity_id,
           student_id,
           attendance_status,
           participation_source,
           created_at
         )
         VALUES (?, ?, 'registered', 'voluntary', datetime('now'))`,
        [activityId, user.id]
      );

      return insertResult;
    });

    // Send notification using notification service
    try {
      // Offline LAN: chỉ sử dụng kênh database nội bộ
      await notificationService.send(
        [String(user.id)],
        new ActivityRegistrationNotification(),
        {
          activity_title: activity.title,
          activity_id: activityId,
          date_time: activity.date_time,
          location: activity.location,
        },
        ['database']
      );
    } catch (notifError) {
      console.error('Failed to send notification:', notifError);
    }

    await dbHelpers.createAuditLog(
      user.id,
      'student_register_activity',
      'activities',
      activityId,
      JSON.stringify({
        activity_title: activity.title,
        participation_id: result.lastID,
      })
    );

    // Tạo thông báo cho giảng viên
    await dbRun(
      `INSERT INTO alerts (level, message, related_table, related_id, is_read, created_at)
       VALUES ('info', ?, 'activities', ?, 0, datetime('now'))`,
      [`Học viên ${user.name} đã đăng ký hoạt động "${activity.title}"`, activityId]
    );

    return successResponse({ participation_id: result.lastID }, 'Đăng ký thành công', 201);
  } catch (error: any) {
    console.error('Register activity error:', error);

    // Handle duplicate registration (race-safe fallback)
    if (error.message === 'ALREADY_REGISTERED' || isParticipationDuplicateError(error)) {
      return errorResponse(ApiError.validation('Bạn đã đăng ký hoạt động này rồi'));
    }

    // Handle capacity error
    if (error.message === 'CAPACITY_FULL') {
      return errorResponse(ApiError.validation('Hoạt động đã hết chỗ'));
    }

    return errorResponse(
      error instanceof ApiError ||
        (error && typeof error.status === 'number' && typeof error.code === 'string')
        ? error
        : ApiError.internalError('Lỗi máy chủ nội bộ')
    );
  }
}

// DELETE /api/activities/:id/register - Hủy đăng ký
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireApiRole(request, ['student']);
    await ensureParticipationColumns();

    const { id } = await params;
    const activityId = Number(id);
    if (!activityId || Number.isNaN(activityId)) {
      return errorResponse(ApiError.validation('ID hoạt động không hợp lệ'));
    }

    // Kiểm tra hoạt động
    const activity = await dbGet('SELECT * FROM activities WHERE id = ?', [activityId]);

    if (!activity) {
      return errorResponse(ApiError.notFound('Không tìm thấy hoạt động'));
    }

    // Kiểm tra deadline hủy (24h trước hoạt động)
    const activityDate = new Date(activity.date_time);
    const now = new Date();
    const hoursDiff = (activityDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursDiff < 24) {
      return errorResponse(
        ApiError.validation('Không thể hủy đăng ký trong vòng 24 giờ trước hoạt động')
      );
    }

    const cancellationResult = await withTransaction(async () => {
      const participation = (await dbGet(
        `SELECT
           id,
           attendance_status,
           COALESCE(participation_source, 'voluntary') as participation_source
         FROM participations
         WHERE activity_id = ? AND student_id = ? LIMIT 1`,
        [activityId, user.id]
      )) as { id: number; attendance_status: string; participation_source?: string | null } | undefined;

      if (!participation) {
        return { cancelled: false as const, reason: 'not_registered' as const };
      }

      if (participation.participation_source === 'assigned') {
        throw new Error('MANDATORY_PARTICIPATION');
      }

      if (participation.attendance_status === 'attended') {
        throw new Error('ALREADY_ATTENDED');
      }

      await dbRun('DELETE FROM participations WHERE id = ?', [participation.id]);
      return { cancelled: true as const, reason: 'cancelled' as const };
    });

    if (!cancellationResult.cancelled) {
      await dbHelpers.createAuditLog(
        user.id,
        'student_unregister_activity_noop',
        'activities',
        activityId,
        JSON.stringify({
          reason: cancellationResult.reason,
          activity_title: activity.title,
        })
      );

      return successResponse(
        { cancelled: false, already_not_registered: true },
        'Không có đăng ký nào để hủy'
      );
    }

    await dbHelpers.createAuditLog(
      user.id,
      'student_unregister_activity',
      'activities',
      activityId,
      JSON.stringify({
        activity_title: activity.title,
      })
    );

    // Tạo thông báo cho học viên
    await dbRun(
      `INSERT INTO notifications (user_id, type, title, message, related_table, related_id, is_read, created_at)
       VALUES (?, 'registration', ?, ?, 'activities', ?, 0, datetime('now'))`,
      [
        user.id,
        'Hủy đăng ký thành công',
        `Bạn đã hủy đăng ký hoạt động "${activity.title}".`,
        activityId,
      ]
    );

    // Tạo thông báo cho giảng viên
    await dbRun(
      `INSERT INTO alerts (level, message, related_table, related_id, is_read, created_at)
       VALUES ('info', ?, 'activities', ?, 0, datetime('now'))`,
      [`Học viên ${user.name} đã hủy đăng ký hoạt động "${activity.title}"`, activityId]
    );

    return successResponse({ cancelled: true }, 'Hủy đăng ký thành công');
  } catch (error: any) {
    console.error('Cancel registration error:', error);

    if (error.message === 'ALREADY_ATTENDED') {
      return errorResponse(ApiError.validation('Không thể hủy sau khi đã điểm danh'));
    }

    if (error.message === 'MANDATORY_PARTICIPATION') {
      return errorResponse(
        ApiError.validation('Ban dang nam trong danh sach tham gia bat buoc nen khong the tu huy dang ky')
      );
    }

    return errorResponse(
      error instanceof ApiError ||
        (error && typeof error.status === 'number' && typeof error.code === 'string')
        ? error
        : ApiError.internalError('Lỗi máy chủ nội bộ')
    );
  }
}
