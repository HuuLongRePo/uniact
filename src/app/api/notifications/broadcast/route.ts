import { NextRequest } from 'next/server';
import { dbAll, dbRun } from '@/lib/database';
import { apiHandler, ApiError, successResponse } from '@/lib/api-response';

export const POST = apiHandler(async (req: NextRequest) => {
  const teacherId = req.headers.get('x-user-id');
  if (!teacherId) throw ApiError.unauthorized('Chưa đăng nhập');

  const body = await req.json();
  const { class_id, title, message, type = 'info' } = body;

  if (!class_id || !title?.trim() || !message?.trim()) {
    throw ApiError.validation('Thiếu trường bắt buộc: class_id, title, message');
  }

  // Xác minh giảng viên sở hữu lớp học
  const classCheck = await dbAll('SELECT id FROM classes WHERE id = ? AND teacher_id = ?', [
    class_id,
    teacherId,
  ]);

  if (!classCheck || classCheck.length === 0) {
    throw ApiError.forbidden('Bạn không phụ trách lớp này');
  }

  // Lấy tất cả học viên trong lớp
  const students = await dbAll(`SELECT user_id FROM class_members WHERE class_id = ?`, [class_id]);

  if (!students || students.length === 0) {
    throw ApiError.notFound('Không tìm thấy học viên trong lớp này');
  }

  // Tạo notifications hàng loạt
  const now = new Date().toISOString();
  let successCount = 0;

  for (const student of students) {
    try {
      await dbRun(
        `INSERT INTO notifications (user_id, title, message, type, created_at)
           VALUES (?, ?, ?, ?, ?)`,
        [student.user_id, title.trim(), message.trim(), type, now]
      );
      successCount++;
    } catch (e) {
      console.error('Notification insert error:', e);
    }
  }

  // Log audit trail
  try {
    await dbRun(
      `INSERT INTO audit_logs (actor_id, action, target_table, target_id, details, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      [
        teacherId,
        'broadcast_notification',
        'classes',
        class_id,
        `Broadcast to ${successCount} students: ${title}`,
        now,
      ]
    );
  } catch (e) {
    console.error('Audit log error:', e);
  }

  return successResponse(
    { count: successCount },
    `Đã gửi thông báo broadcast tới ${successCount}/${students.length} học viên`
  );
});
