import { NextRequest } from 'next/server';
import { requireAuth, requireRole } from '@/lib/guards';
import { dbHelpers, dbGet, dbRun } from '@/lib/database';
import { writeFile, mkdir, readdir, stat } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import { teacherCanAccessActivity } from '@/lib/activity-access';

// POST /api/activities/:id/attachments - Upload attachment
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const { id } = await params;
    const activityId = Number(id);
    if (!activityId || isNaN(activityId)) {
      return errorResponse(ApiError.validation('ID hoạt động không hợp lệ'));
    }

    // Check if activity exists
    const existingActivity = await dbHelpers.getActivityById(activityId);
    if (!existingActivity) {
      return errorResponse(ApiError.notFound('Không tìm thấy hoạt động'));
    }

    if (user.role === 'teacher' && !(await teacherCanAccessActivity(Number(user.id), activityId))) {
      return errorResponse(ApiError.forbidden('Bạn không có quyền tải file lên hoạt động này'));
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return errorResponse(ApiError.validation('Vui lòng chọn file'));
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return errorResponse(ApiError.validation('File quá lớn (tối đa 10MB)'));
    }

    // Validate file type (allow common document and image types)
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',
    ];
    if (!allowedTypes.includes(file.type)) {
      return errorResponse(ApiError.validation('Định dạng file không được phép'));
    }

    // Create upload directory for this activity
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'activities', String(activityId));
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${timestamp}_${originalName}`;
    const filePath = join(uploadDir, fileName);

    // Save file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Persist metadata to normalized table (used by Teacher "Files" UI)
    const fileUrl = `/uploads/activities/${activityId}/${fileName}`;
    try {
      const existing = await dbGet(
        'SELECT id FROM activity_attachments WHERE activity_id = ? AND file_path = ? LIMIT 1',
        [activityId, fileUrl]
      );

      if (!existing) {
        await dbRun(
          `INSERT INTO activity_attachments (activity_id, file_name, file_path, file_size, mime_type, uploaded_by, uploaded_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [activityId, file.name, fileUrl, file.size, file.type, user.id, new Date().toISOString()]
        );
      }
    } catch {
      // If DB insert fails, still allow the upload to succeed (file is saved on disk).
    }

    // Create audit log
    await dbHelpers.createAuditLog(
      user.id,
      'upload_attachment',
      'activities',
      activityId,
      JSON.stringify({ filename: fileName, size: file.size, type: file.type })
    );

    const uploadedFile = {
      name: fileName,
      originalName: file.name,
      size: file.size,
      type: file.type,
      url: fileUrl,
    };

    return successResponse({ file: uploadedFile }, 'Tải file thành công', 201);
  } catch (error: any) {
    console.error('Upload attachment error:', error);
    return errorResponse(ApiError.internalError('Lỗi máy chủ nội bộ'));
  }
}

// GET /api/activities/:id/attachments - List attachments
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    let user;
    try {
      user = await requireAuth(request);
    } catch {
      return errorResponse(ApiError.unauthorized('Chưa đăng nhập'));
    }

    const { id } = await params;
    const activityId = Number(id);
    if (!activityId || isNaN(activityId)) {
      return errorResponse(ApiError.validation('ID hoạt động không hợp lệ'));
    }

    // Check if activity exists
    const existingActivity = await dbHelpers.getActivityById(activityId);
    if (!existingActivity) {
      return errorResponse(ApiError.notFound('Không tìm thấy hoạt động'));
    }

    if (user.role === 'teacher' && !(await teacherCanAccessActivity(Number(user.id), activityId))) {
      return errorResponse(ApiError.forbidden('Không có quyền truy cập'));
    }

    // List files in upload directory
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'activities', String(activityId));

    if (!existsSync(uploadDir)) {
      return successResponse({ attachments: [] });
    }

    const files = await readdir(uploadDir);
    const attachments = await Promise.all(
      files.map(async (file) => {
        const filePath = join(uploadDir, file);
        const stats = await stat(filePath);
        return {
          name: file,
          size: stats.size,
          url: `/uploads/activities/${activityId}/${file}`,
          uploadedAt: stats.mtime.toISOString(),
        };
      })
    );

    return successResponse({ attachments });
  } catch (error: any) {
    console.error('List attachments error:', error);
    return errorResponse(ApiError.internalError('Lỗi máy chủ nội bộ'));
  }
}
