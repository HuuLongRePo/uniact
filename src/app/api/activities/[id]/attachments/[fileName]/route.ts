import { NextRequest } from 'next/server';
import { requireRole } from '@/lib/guards';
import { dbHelpers } from '@/lib/database';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import { teacherCanAccessActivity } from '@/lib/activity-access';

// DELETE /api/activities/:id/attachments/:fileName - Delete attachment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fileName: string }> }
) {
  try {
    let user;
    try {
      user = await requireRole(request, ['teacher', 'admin']);
    } catch (err: any) {
      const message = String(err?.message || '');
      return errorResponse(
        message.includes('Không có quyền')
          ? ApiError.forbidden('Không có quyền truy cập')
          : ApiError.unauthorized('Chưa đăng nhập')
      );
    }

    const { id, fileName } = await params;
    const activityId = Number(id);

    if (!activityId || isNaN(activityId)) {
      return errorResponse(ApiError.validation('ID hoạt động không hợp lệ'));
    }

    if (!fileName) {
      return errorResponse(ApiError.validation('Thiếu tên file'));
    }

    // Validate fileName to prevent directory traversal
    if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
      return errorResponse(ApiError.validation('Tên file không hợp lệ'));
    }

    // Check if activity exists
    const existingActivity = await dbHelpers.getActivityById(activityId);
    if (!existingActivity) {
      return errorResponse(ApiError.notFound('Không tìm thấy hoạt động'));
    }

    if (user.role === 'teacher' && !(await teacherCanAccessActivity(Number(user.id), activityId))) {
      return errorResponse(ApiError.forbidden('Bạn không có quyền xóa file trong hoạt động thuộc phạm vi quản lý'));
    }

    // Delete file
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'activities', String(activityId));
    const filePath = join(uploadDir, fileName);

    // Verify file is in the correct directory (prevent traversal)
    if (!filePath.startsWith(uploadDir)) {
      return errorResponse(ApiError.validation('Đường dẫn file không hợp lệ'));
    }

    if (!existsSync(filePath)) {
      return errorResponse(ApiError.notFound('Không tìm thấy file'));
    }

    await unlink(filePath);

    // Create audit log
    await dbHelpers.createAuditLog(
      user.id,
      'delete_attachment',
      'activities',
      activityId,
      JSON.stringify({ filename: fileName })
    );

    return successResponse({ deleted: true }, 'Xóa file thành công');
  } catch (error: any) {
    console.error('Delete attachment error:', error);
    return errorResponse(ApiError.internalError('Lỗi máy chủ nội bộ'));
  }
}
