import { NextRequest } from 'next/server';
import { requireRole } from '@/lib/guards';
import { dbAll, dbGet, dbRun } from '@/lib/database';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import { teacherCanAccessActivity } from '@/lib/activity-access';
import { mkdir, readdir, stat, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

function guessMimeType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.gif':
      return 'image/gif';
    case '.webp':
      return 'image/webp';
    case '.pdf':
      return 'application/pdf';
    case '.doc':
      return 'application/msword';
    case '.docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case '.xls':
      return 'application/vnd.ms-excel';
    case '.xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case '.csv':
      return 'text/csv';
    case '.txt':
      return 'text/plain';
    default:
      return 'application/octet-stream';
  }
}

async function getActivityForFiles(activityId: number) {
  return dbGet('SELECT id, title, teacher_id FROM activities WHERE id = ?', [activityId]);
}

async function listFiles(activityId: number) {
  return dbAll(
    `SELECT 
      aa.id,
      aa.activity_id,
      aa.file_path,
      aa.file_name,
      aa.file_size,
      aa.mime_type AS file_type,
      aa.uploaded_at,
      COALESCE(u.full_name, u.name, u.username, CAST(aa.uploaded_by AS TEXT)) AS uploaded_by
    FROM activity_attachments aa
    LEFT JOIN users u ON u.id = aa.uploaded_by
    WHERE aa.activity_id = ?
    ORDER BY aa.uploaded_at DESC, aa.id DESC`,
    [activityId]
  );
}

function isFormDataFile(value: FormDataEntryValue | null): value is File {
  return Boolean(
    value && typeof value !== 'string' && typeof (value as File).arrayBuffer === 'function'
  );
}

function getUploadedFiles(formData: FormData): File[] {
  const singleFile = formData.get('file');
  const multipleFiles = formData.getAll('files');
  const candidates = [singleFile, ...multipleFiles].filter(isFormDataFile);

  return candidates.filter(
    (file, index, files) =>
      files.findIndex(
        (candidate) =>
          candidate.name === file.name &&
          candidate.size === file.size &&
          candidate.type === file.type
      ) === index
  );
}

// POST /api/activities/:id/files - Upload file (Teacher/Admin)
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

    const activity = await getActivityForFiles(activityId);
    if (!activity) {
      return errorResponse(ApiError.notFound('Không tìm thấy hoạt động'));
    }

    if (user.role === 'teacher' && !(await teacherCanAccessActivity(Number(user.id), activityId))) {
      return errorResponse(ApiError.forbidden('Bạn không có quyền tải file lên hoạt động này'));
    }

    const formData = await request.formData();
    const [file, ...additionalFiles] = getUploadedFiles(formData);
    if (!file) {
      return errorResponse(ApiError.validation('Vui lòng chọn file'));
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return errorResponse(ApiError.validation('File quá lớn (tối đa 10MB)'));
    }

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

    const uploadDir = path.join(
      process.cwd(),
      'public',
      'uploads',
      'activities',
      String(activityId)
    );
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const timestamp = Date.now();
    const originalNameSafe = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storedFileName = `${timestamp}_${originalNameSafe}`;
    const fullPath = path.join(uploadDir, storedFileName);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(fullPath, buffer);

    const fileUrl = `/uploads/activities/${activityId}/${storedFileName}`;

    const insert = await dbRun(
      `INSERT INTO activity_attachments (activity_id, file_name, file_path, file_size, mime_type, uploaded_by, uploaded_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [activityId, file.name, fileUrl, file.size, file.type, user.id, new Date().toISOString()]
    );

    const created = await dbGet(
      `SELECT 
        aa.id,
        aa.activity_id,
        aa.file_path,
        aa.file_name,
        aa.file_size,
        aa.mime_type AS file_type,
        aa.uploaded_at,
        COALESCE(u.full_name, u.name, u.username, CAST(aa.uploaded_by AS TEXT)) AS uploaded_by
      FROM activity_attachments aa
      LEFT JOIN users u ON u.id = aa.uploaded_by
      WHERE aa.id = ? AND aa.activity_id = ?`,
      [Number(insert.lastID), activityId]
    );

    const createdFiles = [created];

    for (const [index, extraFile] of additionalFiles.entries()) {
      if (extraFile.size > maxSize) {
        return errorResponse(ApiError.validation('File quá lớn (tối đa 10MB)'));
      }

      if (!allowedTypes.includes(extraFile.type)) {
        return errorResponse(ApiError.validation('Định dạng file không được phép'));
      }

      const extraTimestamp = Date.now();
      const extraNameSafe = extraFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const extraStoredFileName = `${extraTimestamp}_${index + 1}_${extraNameSafe}`;
      const extraFullPath = path.join(uploadDir, extraStoredFileName);

      const extraBytes = await extraFile.arrayBuffer();
      const extraBuffer = Buffer.from(extraBytes);
      await writeFile(extraFullPath, extraBuffer);

      const extraFileUrl = `/uploads/activities/${activityId}/${extraStoredFileName}`;

      const extraInsert = await dbRun(
        `INSERT INTO activity_attachments (activity_id, file_name, file_path, file_size, mime_type, uploaded_by, uploaded_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          activityId,
          extraFile.name,
          extraFileUrl,
          extraFile.size,
          extraFile.type,
          user.id,
          new Date().toISOString(),
        ]
      );

      const extraCreated = await dbGet(
        `SELECT 
          aa.id,
          aa.activity_id,
          aa.file_path,
          aa.file_name,
          aa.file_size,
          aa.mime_type AS file_type,
          aa.uploaded_at,
          COALESCE(u.full_name, u.name, u.username, CAST(aa.uploaded_by AS TEXT)) AS uploaded_by
        FROM activity_attachments aa
        LEFT JOIN users u ON u.id = aa.uploaded_by
        WHERE aa.id = ? AND aa.activity_id = ?`,
        [Number(extraInsert.lastID), activityId]
      );

      createdFiles.push(extraCreated);
    }

    return successResponse(
      { file: createdFiles[0], files: createdFiles },
      'Tải file thành công',
      201
    );
  } catch (error: any) {
    console.error('Upload activity file error:', error);
    return errorResponse(ApiError.internalError('Lỗi máy chủ nội bộ'));
  }
}

// GET /api/activities/:id/files - List activity files (Teacher/Admin)
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const activity = await getActivityForFiles(activityId);
    if (!activity) {
      return errorResponse(ApiError.notFound('Không tìm thấy hoạt động'));
    }

    if (user.role === 'teacher' && !(await teacherCanAccessActivity(Number(user.id), activityId))) {
      return errorResponse(ApiError.forbidden('Không có quyền truy cập'));
    }

    // Best-effort: if there are files on disk but not in DB yet, backfill them.
    const uploadDir = path.join(
      process.cwd(),
      'public',
      'uploads',
      'activities',
      String(activityId)
    );
    if (existsSync(uploadDir)) {
      try {
        const existing = await dbAll(
          'SELECT id, file_path FROM activity_attachments WHERE activity_id = ?',
          [activityId]
        );
        const knownPaths = new Set((existing || []).map((r: any) => String(r.file_path)));

        const diskFiles = await readdir(uploadDir);
        for (const fileName of diskFiles) {
          if (
            !fileName ||
            fileName.includes('..') ||
            fileName.includes('/') ||
            fileName.includes('\\')
          )
            continue;

          const urlPath = `/uploads/activities/${activityId}/${fileName}`;
          if (knownPaths.has(urlPath)) continue;

          const fileOnDisk = path.join(uploadDir, fileName);
          const st = await stat(fileOnDisk);

          await dbRun(
            `INSERT INTO activity_attachments (activity_id, file_name, file_path, file_size, mime_type, uploaded_by, uploaded_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              activityId,
              fileName,
              urlPath,
              st.size,
              guessMimeType(fileName),
              user.id,
              st.mtime.toISOString(),
            ]
          );
        }
      } catch {
        // Ignore backfill errors; listing should still work for existing DB records.
      }
    } else {
      // Ensure directory exists for future writes.
      try {
        await mkdir(uploadDir, { recursive: true });
      } catch {
        // ignore
      }
    }

    const files = await listFiles(activityId);
    return successResponse({ files, activity_title: activity.title });
  } catch (error: any) {
    console.error('List activity files error:', error);
    return errorResponse(ApiError.internalError('Lỗi máy chủ nội bộ'));
  }
}
