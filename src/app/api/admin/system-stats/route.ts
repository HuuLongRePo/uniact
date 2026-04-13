import { NextRequest } from 'next/server';
import { requireApiRole } from '@/lib/guards';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import fs from 'fs';
import path from 'path';

function formatUptime(): string {
  const uptime = process.uptime();
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

// GET - Lấy thống kê hệ thống
export async function GET(request: NextRequest) {
  try {
    await requireApiRole(request, ['admin']);

    const configuredPath = process.env.DATABASE_PATH || './uniact.db';
    const dbPath = path.isAbsolute(configuredPath)
      ? configuredPath
      : path.join(process.cwd(), configuredPath);

    let dbSize = '0 MB';
    try {
      const stats = fs.statSync(dbPath);
      const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
      dbSize = `${sizeInMB} MB`;
    } catch (e) {
      console.error('Cannot read DB size:', e);
    }

    let lastBackup = null;
    try {
      const backupDir = path.join(process.cwd(), 'backups');
      if (fs.existsSync(backupDir)) {
        const files = fs
          .readdirSync(backupDir)
          .filter((f) => f.endsWith('.db'))
          .map((f) => ({
            name: f,
            time: fs.statSync(path.join(backupDir, f)).mtime.getTime(),
          }))
          .sort((a, b) => b.time - a.time);

        if (files.length > 0) {
          const lastFile = files[0];
          const date = new Date(lastFile.time);
          lastBackup = date.toLocaleString('vi-VN');
        }
      }
    } catch (e) {
      console.error('Cannot read backup dir:', e);
    }

    return successResponse({
      dbSize,
      dbPath,
      uptime: formatUptime(),
      lastBackup,
    });
  } catch (error: any) {
    console.error('GET /api/admin/system-stats error:', error);
    return errorResponse(
      error instanceof ApiError ||
        (error && typeof error.status === 'number' && typeof error.code === 'string')
        ? error
        : ApiError.internalError('Không thể tải thống kê hệ thống', { details: error?.message })
    );
  }
}
