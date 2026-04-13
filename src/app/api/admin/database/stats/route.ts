import { NextRequest } from 'next/server';
import { requireApiRole } from '@/lib/guards';
import { dbGet } from '@/lib/database';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import fs from 'fs';
import path from 'path';

// GET /api/admin/database/stats - Get database statistics
export async function GET(request: NextRequest) {
  try {
    await requireApiRole(request, ['admin']);

    const configuredPath = process.env.DATABASE_PATH || 'uniact.db';
    const dbPath = path.isAbsolute(configuredPath)
      ? configuredPath
      : path.join(process.cwd(), configuredPath);
    const stats = fs.statSync(dbPath);
    const size_mb = stats.size / (1024 * 1024);

    const tables = (await dbGet(`
      SELECT COUNT(*) as count 
      FROM sqlite_master 
      WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
    `)) as { count: number };

    const userCount = (await dbGet('SELECT COUNT(*) as count FROM users')) as { count: number };
    const activityCount = (await dbGet('SELECT COUNT(*) as count FROM activities')) as {
      count: number;
    };
    const participationCount = (await dbGet('SELECT COUNT(*) as count FROM participations')) as {
      count: number;
    };
    const records =
      (userCount?.count || 0) + (activityCount?.count || 0) + (participationCount?.count || 0);

    let lastBackup = null;
    try {
      const backup = (await dbGet(
        'SELECT created_at FROM backup_history ORDER BY created_at DESC LIMIT 1'
      )) as { created_at: string } | undefined;
      lastBackup = backup?.created_at || null;
    } catch {
      lastBackup = null;
    }

    return successResponse({
      stats: {
        size_mb,
        tables: tables?.count || 0,
        records,
        last_backup: lastBackup,
      },
    });
  } catch (error: any) {
    console.error('Get DB stats error:', error);
    return errorResponse(
      error instanceof ApiError ||
        (error && typeof error.status === 'number' && typeof error.code === 'string')
        ? error
        : ApiError.internalError('Không thể tải thống kê cơ sở dữ liệu', { details: error?.message })
    );
  }
}
