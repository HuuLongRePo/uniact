import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/guards';
import { dbGet } from '@/lib/database';
import fs from 'fs';
import path from 'path';

// GET /api/admin/database/stats - Get database statistics
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get database file size (respect env or default to uniact.db)
    const configuredPath = process.env.DATABASE_PATH || 'uniact.db';
    const dbPath = path.isAbsolute(configuredPath)
      ? configuredPath
      : path.join(process.cwd(), configuredPath);
    const stats = fs.statSync(dbPath);
    const size_mb = stats.size / (1024 * 1024);

    // Count tables
    const tables = (await dbGet(`
      SELECT COUNT(*) as count 
      FROM sqlite_master 
      WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
    `)) as { count: number };

    // Count total records (simplified - count users + activities + participations)
    const userCount = (await dbGet('SELECT COUNT(*) as count FROM users')) as { count: number };
    const activityCount = (await dbGet('SELECT COUNT(*) as count FROM activities')) as {
      count: number;
    };
    const participationCount = (await dbGet('SELECT COUNT(*) as count FROM participations')) as {
      count: number;
    };
    const records =
      (userCount?.count || 0) + (activityCount?.count || 0) + (participationCount?.count || 0);

    // Get last backup time (from backup_history table if exists)
    let lastBackup = null;
    try {
      const backup = (await dbGet(
        'SELECT created_at FROM backup_history ORDER BY created_at DESC LIMIT 1'
      )) as { created_at: string } | undefined;
      lastBackup = backup?.created_at || null;
    } catch {
      // Table doesn't exist yet
    }

    return NextResponse.json({
      success: true,
      stats: {
        size_mb,
        tables: tables?.count || 0,
        records,
        last_backup: lastBackup,
      },
    });
  } catch (error: any) {
    console.error('Get DB stats error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
