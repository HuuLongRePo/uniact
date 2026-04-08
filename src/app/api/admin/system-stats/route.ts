import { NextResponse } from 'next/server';
import { getUserFromSession } from '@/lib/auth';
import { db } from '@/lib/database';
import fs from 'fs';
import path from 'path';

// GET - Lấy thống kê hệ thống
export async function GET() {
  try {
    const user = await getUserFromSession();

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Database size
    const dbPath = process.env.DATABASE_PATH || './uniact.db';
    let dbSize = '0 MB';
    try {
      const stats = fs.statSync(dbPath);
      const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
      dbSize = `${sizeInMB} MB`;
    } catch (e) {
      console.error('Cannot read DB size:', e);
    }

    // Uptime (giả sử server chạy liên tục)
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const uptimeStr = `${hours}h ${minutes}m`;

    // Last backup
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

    return NextResponse.json({
      dbSize,
      dbPath,
      uptime: uptimeStr,
      lastBackup,
    });
  } catch (error: any) {
    console.error('GET /api/admin/system-stats error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
