import { NextRequest } from 'next/server';
import { requireApiRole } from '@/lib/guards';
import { rateLimit } from '@/lib/rateLimit';
import { dbRun } from '@/lib/database';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import fs from 'fs';
import path from 'path';

// POST /api/admin/database/backup - Create database backup
export async function POST(request: NextRequest) {
  try {
    const rl = rateLimit(request, 5, 60 * 60 * 1000);
    if (!rl.allowed) {
      return errorResponse(
        new ApiError('RATE_LIMITED', 'Too many backup requests. Max 5 per hour', 429)
      );
    }

    const user = await requireApiRole(request, ['admin']);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `uniact_backup_${timestamp}_${Date.now()}.db`;

    const dbPath = path.join(process.cwd(), 'uniact.db');
    const backupDir = path.join(process.cwd(), 'backups');

    // Create backups directory if not exists
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const backupPath = path.join(backupDir, filename);

    // Copy database file
    fs.copyFileSync(dbPath, backupPath);

    // Get file size
    const stats = fs.statSync(backupPath);
    const size_mb = stats.size / (1024 * 1024);

    // Create backup_history table if not exists
    await dbRun(`
      CREATE TABLE IF NOT EXISTS backup_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL,
        size_mb REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by TEXT NOT NULL,
        status TEXT DEFAULT 'success'
      )
    `);

    // Record backup in history
    await dbRun(
      `INSERT INTO backup_history (filename, size_mb, created_by, status) 
       VALUES (?, ?, ?, 'success')`,
      [filename, size_mb, user.email]
    );

    // Also create audit log
    await dbRun(
      `INSERT INTO audit_logs (actor_id, action, target_table, target_id, details, created_at)
       VALUES (?, 'DATABASE_BACKUP', 'system', 0, ?, datetime('now'))`,
      [user.id, JSON.stringify({ filename, size_mb })]
    );

    return successResponse(
      { filename, size_mb },
      'Backup created successfully'
    );
  } catch (error: any) {
    console.error('Backup error:', error);
    return errorResponse(
      error instanceof ApiError ? error : ApiError.internalError(error?.message || 'Backup failed')
    );
  }
}
