import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/guards';
import { dbGet } from '@/lib/database';
import { ApiError, errorResponse } from '@/lib/api-response';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

function resolveActivityPublicFilePath(
  activityId: number,
  filePathOrUrl: string
): { fullPath: string } {
  const raw = String(filePathOrUrl || '').trim();
  if (!raw) throw ApiError.validation('Đường dẫn file không hợp lệ');

  let relative = raw;
  if (relative.startsWith('public/')) relative = relative.slice('public/'.length);
  if (relative.startsWith('/')) relative = relative.slice(1);

  const relNormalized = relative.replace(/\\/g, '/');
  const expectedPrefix = `uploads/activities/${activityId}/`;
  if (!relNormalized.startsWith(expectedPrefix) || relNormalized.includes('..')) {
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

function isImageMime(mimeType: string): boolean {
  return /^image\/(jpeg|png|gif|webp)$/i.test(String(mimeType || ''));
}

// GET /api/activities/:id/files/:fileId/preview - Preview image file
export async function GET(
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
      'SELECT id, file_path, mime_type FROM activity_attachments WHERE id = ? AND activity_id = ?',
      [attachmentId, activityId]
    );

    if (!attachment) {
      return errorResponse(ApiError.notFound('Không tìm thấy file'));
    }

    const mimeType = String(attachment.mime_type || '');
    if (!isImageMime(mimeType)) {
      return errorResponse(ApiError.validation('File không hỗ trợ xem trước'));
    }

    const { fullPath } = resolveActivityPublicFilePath(activityId, String(attachment.file_path));
    if (!existsSync(fullPath)) {
      return errorResponse(ApiError.notFound('Không tìm thấy file'));
    }

    const buffer = await readFile(fullPath);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    console.error('Preview activity file error:', error);
    return errorResponse(ApiError.internalError('Lỗi máy chủ nội bộ'));
  }
}
