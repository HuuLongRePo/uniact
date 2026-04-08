import { NextRequest, NextResponse } from 'next/server';
import { dbRun, dbAll } from '@/lib/database';
import { getUserFromToken } from '@/lib/auth';
import { ApiError, successResponse, errorResponse } from '@/lib/api-response';

// POST /api/students/notify - Gửi thông báo cho học viên
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return errorResponse(ApiError.unauthorized('Chưa đăng nhập'));
    }

    const user = await getUserFromToken(token);
    if (!user || (user.role !== 'admin' && user.role !== 'teacher')) {
      return errorResponse(ApiError.forbidden('Không có quyền truy cập'));
    }

    const { student_ids, title, message, type = 'info' } = await request.json();

    // Validation
    if (!student_ids || !Array.isArray(student_ids) || student_ids.length === 0) {
      return errorResponse(ApiError.validation('Danh sách học viên không hợp lệ'));
    }

    if (!title || !message) {
      return errorResponse(ApiError.validation('Tiêu đề và nội dung không được trống'));
    }

    // Kiểm tra quyền: teacher chỉ gửi cho học viên trong lớp của mình
    if (user.role === 'teacher') {
      const teacherClasses = await dbAll('SELECT id FROM classes WHERE teacher_id = ?', [user.id]);
      const teacherClassIds = teacherClasses.map((c) => c.id);

      const students = await dbAll(
        `SELECT id, class_id FROM users WHERE id IN (${student_ids.join(',')}) AND role = 'student'`
      );

      const invalidStudents = students.filter((s) => !teacherClassIds.includes(s.class_id));
      if (invalidStudents.length > 0) {
        return errorResponse(
          ApiError.forbidden('Bạn chỉ có thể gửi thông báo cho học viên trong lớp của mình')
        );
      }
    }

    // Tạo bảng notifications nếu chưa có
    await dbRun(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT DEFAULT 'info',
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        related_table TEXT,
        related_id INTEGER,
        is_read INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Gửi thông báo cho từng học viên
    let successCount = 0;
    for (const studentId of student_ids) {
      try {
        await dbRun(
          `INSERT INTO notifications (user_id, type, title, message, related_table)
           VALUES (?, ?, ?, ?, 'teacher_message')`,
          [studentId, type, title, message]
        );
        successCount++;
      } catch (e) {
        console.error(`Không thể gửi thông báo đến học viên ${studentId}:`, e);
      }
    }

    // Log audit
    await dbRun(
      `INSERT INTO audit_logs (actor_id, action, target_table, target_id, details)
       VALUES (?, 'SEND_NOTIFICATION', 'notifications', NULL, ?)`,
      [user.id, `Gửi thông báo cho ${successCount} học viên: ${title}`]
    );

    return successResponse(
      { successCount },
      `Đã gửi thông báo cho ${successCount}/${student_ids.length} học viên`
    );
  } catch (error: any) {
    console.error('Lỗi gửi thông báo cho học viên:', error);
    return errorResponse(
      ApiError.internalError('Lỗi khi gửi thông báo', { details: error?.message })
    );
  }
}
