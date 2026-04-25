import { NextRequest } from 'next/server';
import { dbRun } from '@/lib/database';
import { requireApiRole } from '@/lib/guards';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import { toVietnamFileTimestamp } from '@/lib/timezone';
import fs from 'fs';
import path from 'path';

function validateBackupFilename(filename: string | null | undefined): string {
  if (!filename) {
    throw ApiError.validation('Thiếu tên file backup');
  }

  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    throw ApiError.validation('Tên file backup không hợp lệ');
  }

  return filename;
}

// POST /api/admin/database/restore - Restore database from backup
export async function POST(request: NextRequest) {
  try {
    const user = await requireApiRole(request, ['admin']);

    let body: { filename?: string };
    try {
      body = await request.json();
    } catch {
      return errorResponse(ApiError.badRequest('Dữ liệu JSON không hợp lệ'));
    }

    const filename = validateBackupFilename(body.filename);
    const backupPath = path.join(process.cwd(), 'backups', filename);
    const dbPath = path.join(process.cwd(), 'uniact.db');

    if (!fs.existsSync(backupPath)) {
      return errorResponse(ApiError.notFound('Không tìm thấy file backup'));
    }

    if (!fs.existsSync(dbPath)) {
      return errorResponse(ApiError.notFound('Không tìm thấy cơ sở dữ liệu hiện tại'));
    }

    const safetyBackup = path.join(
      process.cwd(),
      'backups',
      `pre_restore_${toVietnamFileTimestamp(new Date())}.db`
    );
    fs.copyFileSync(dbPath, safetyBackup);
    fs.copyFileSync(backupPath, dbPath);

    try {
      await dbRun(
        `INSERT INTO audit_logs (actor_id, action, target_table, target_id, details, created_at)
         VALUES (?, 'DATABASE_RESTORE', 'system', 0, ?, datetime('now'))`,
        [user.id, JSON.stringify({ filename, safety_backup: path.basename(safetyBackup) })]
      );
    } catch (auditError) {
      console.error('Failed to write audit log (database restore):', auditError);
    }

    return successResponse(
      {
        restored: true,
        filename,
        safety_backup: path.basename(safetyBackup),
      },
      'Khôi phục cơ sở dữ liệu thành công'
    );
  } catch (error: any) {
    console.error('Restore error:', error);
    return errorResponse(
      error instanceof ApiError ||
        (error && typeof error.status === 'number' && typeof error.code === 'string')
        ? error
        : ApiError.internalError('Không thể khôi phục cơ sở dữ liệu', { details: error?.message })
    );
  }
}
