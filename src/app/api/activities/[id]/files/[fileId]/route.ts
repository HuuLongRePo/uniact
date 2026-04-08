import { NextRequest } from 'next/server';
import { requireRole } from '@/lib/guards';
import { dbGet, dbRun, dbHelpers } from '@/lib/database';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

function resolveActivityPublicFilePath(
  activityId: number,
  filePathOrUrl: string
): { fullPath: string } {
  const raw = String(filePathOrUrl || '').trim();
  if (!raw) throw ApiError.validation('Đường dẫn file không hợp lệ');

  // Accept: /uploads/activities/:id/<file> or uploads/activities/:id/<file>
  let relative = raw;
  if (relative.startsWith('public/')) relative = relative.slice('public/'.length);
  if (relative.startsWith('/')) relative = relative.slice(1);

  // Normalize to forward slashes for prefix check.
  const relNormalized = relative.replace(/\\/g, '/');
  const expectedPrefix = `uploads/activities/${activityId}/`;
  if (!relNormalized.startsWith(expectedPrefix)) {
    throw ApiError.validation('Đường dẫn file không hợp lệ');
  }

  if (relNormalized.includes('..')) {
    throw ApiError.validation('Đường dẫn file không hợp lệ');
  }

  const activityDir = path.resolve(
    process.cwd(),
    'public',
    'uploads',
    'activities',
    String(activityId)
  );
  const fullPath = path.resolve(process.cwd(), 'public', relNormalized);

  if (!fullPath.startsWith(activityDir + path.sep) && fullPath !== activityDir) {
    throw ApiError.validation('Đường dẫn file không hợp lệ');
  }

  return { fullPath };
}

// DELETE /api/activities/:id/files/:fileId - Delete file
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
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

    const { id, fileId } = await params;
    const activityId = Number(id);
    const attachmentId = Number(fileId);

    if (!activityId || isNaN(activityId)) {
      return errorResponse(ApiError.validation('ID hoạt động không hợp lệ'));
    }

    if (!attachmentId || isNaN(attachmentId)) {
      return errorResponse(ApiError.validation('ID file không hợp lệ'));
    }

    const activity = await dbGet('SELECT id, teacher_id FROM activities WHERE id = ?', [
      activityId,
    ]);
    if (!activity) {
      return errorResponse(ApiError.notFound('Không tìm thấy hoạt động'));
    }

    if (user.role === 'teacher' && Number(activity.teacher_id) !== Number(user.id)) {
      return errorResponse(ApiError.forbidden('Không có quyền truy cập'));
    }

    const attachment = await dbGet(
      'SELECT id, file_path, file_name FROM activity_attachments WHERE id = ? AND activity_id = ?',
      [attachmentId, activityId]
    );

    if (!attachment) {
      return errorResponse(ApiError.notFound('Không tìm thấy file'));
    }

    try {
      const { fullPath } = resolveActivityPublicFilePath(activityId, String(attachment.file_path));
      if (existsSync(fullPath)) {
        await unlink(fullPath);
      }
    } catch {
      // If file path is invalid or file missing, still allow DB cleanup.
    }

    await dbRun('DELETE FROM activity_attachments WHERE id = ? AND activity_id = ?', [
      attachmentId,
      activityId,
    ]);

    try {
      await dbHelpers.createAuditLog(
        user.id,
        'delete_activity_file',
        'activities',
        activityId,
        JSON.stringify({ file_id: attachmentId, file_name: attachment.file_name })
      );
    } catch {
      // ignore
    }

    return successResponse({ deleted: true }, 'Xóa file thành công');
  } catch (error: any) {
    console.error('Delete activity file error:', error);
    return errorResponse(ApiError.internalError('Lỗi máy chủ nội bộ'));
  }
}
