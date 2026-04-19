import { NextRequest } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { dbAll, dbGet, dbRun } from '@/lib/database';
import { requireRole, requireAuth } from '@/lib/guards';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import { teacherCanAccessActivity } from '@/lib/activity-access';

// POST /api/activities/[id]/upload - Upload file attachments for activity
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

    const activityId = parseInt(id);
    if (!activityId || isNaN(activityId)) {
      return errorResponse(ApiError.validation('ID hoạt động không hợp lệ'));
    }

    // Verify activity exists
    const activity = await dbGet(
      'SELECT id, title, teacher_id, status FROM activities WHERE id = ?',
      [activityId]
    );

    if (!activity) {
      return errorResponse(ApiError.notFound('Không tìm thấy hoạt động'));
    }

    if (user.role === 'teacher' && !(await teacherCanAccessActivity(Number(user.id), activityId))) {
      return errorResponse(ApiError.forbidden('Bạn không có quyền tải file lên hoạt động thuộc phạm vi quản lý'));
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return errorResponse(ApiError.validation('Vui lòng chọn file'));
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return errorResponse(ApiError.validation('File quá lớn (tối đa 10MB)'));
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/jpg',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    if (!allowedTypes.includes(file.type)) {
      return errorResponse(
        ApiError.validation('Định dạng file không hợp lệ. Chỉ cho phép: ảnh, PDF, Word, Excel')
      );
    }

    // Create upload directory if not exists
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'activities', activityId.toString());
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${timestamp}-${originalName}`;
    const filePath = join(uploadDir, fileName);

    // Save file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Public URL
    const fileUrl = `/uploads/activities/${activityId}/${fileName}`;

    // Persist to activity_attachments (normalized schema)
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
      // If DB insert fails, still return success (file is saved on disk).
    }

    return successResponse(
      {
        file_name: file.name,
        file_url: fileUrl,
        file_type: file.type,
        file_size: file.size,
      },
      'Tải file thành công'
    );
  } catch (error) {
    console.error('Upload file error:', error);
    return errorResponse(ApiError.internalError('Không thể tải file lên'));
  }
}

// GET /api/activities/[id]/upload - Get list of uploaded files
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    let user;
    try {
      user = await requireAuth(request);
    } catch {
      return errorResponse(ApiError.unauthorized('Chưa đăng nhập'));
    }

    const { id } = await params;
    const activityId = parseInt(id);
    if (!activityId || isNaN(activityId)) {
      return errorResponse(ApiError.validation('ID hoạt động không hợp lệ'));
    }

    const activity = await dbGet('SELECT id FROM activities WHERE id = ?', [activityId]);

    if (!activity) {
      return errorResponse(ApiError.notFound('Không tìm thấy hoạt động'));
    }

    if (user.role === 'teacher' && !(await teacherCanAccessActivity(Number(user.id), activityId))) {
      return errorResponse(ApiError.forbidden('Bạn chỉ có thể xem file của hoạt động thuộc phạm vi quản lý'));
    }

    const rows = await dbAll(
      `SELECT file_name, file_path, mime_type, file_size, uploaded_at, uploaded_by
       FROM activity_attachments
       WHERE activity_id = ?
       ORDER BY uploaded_at DESC, id DESC`,
      [activityId]
    );

    const attachments = (rows || []).map((r: any) => ({
      name: r.file_name,
      url: r.file_path,
      type: r.mime_type,
      size: r.file_size,
      uploaded_at: r.uploaded_at,
      uploaded_by: r.uploaded_by,
    }));

    return successResponse(attachments);
  } catch (error) {
    console.error('Get attachments error:', error);
    return errorResponse(ApiError.internalError('Không thể tải danh sách file'));
  }
}
