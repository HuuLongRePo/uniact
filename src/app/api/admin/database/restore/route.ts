import { NextRequest, NextResponse } from 'next/server';
import { getUserFromSession } from '@/lib/auth';
import { dbRun } from '@/lib/database';
import fs from 'fs';
import path from 'path';

// POST /api/admin/database/restore - Restore database from backup
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { filename } = await request.json();

    if (!filename) {
      return NextResponse.json({ error: 'Filename required' }, { status: 400 });
    }

    // Security: prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
    }

    const backupPath = path.join(process.cwd(), 'backups', filename);
    const dbPath = path.join(process.cwd(), 'uniact.db');

    if (!fs.existsSync(backupPath)) {
      return NextResponse.json({ error: 'Backup file not found' }, { status: 404 });
    }

    // Create a safety backup before restore
    const safetyBackup = path.join(process.cwd(), 'backups', `pre_restore_${Date.now()}.db`);
    fs.copyFileSync(dbPath, safetyBackup);

    // Restore database
    fs.copyFileSync(backupPath, dbPath);

    // Log the restore action (after database is restored)
    try {
      await dbRun(
        `INSERT INTO audit_logs (actor_id, action, target_table, target_id, details, created_at)
         VALUES (?, 'DATABASE_RESTORE', 'system', 0, ?, datetime('now'))`,
        [user.id, JSON.stringify({ filename, safety_backup: path.basename(safetyBackup) })]
      );
    } catch {
      // If audit log fails, continue anyway
    }

    return NextResponse.json({
      success: true,
      message: 'Database restored successfully',
      safety_backup: path.basename(safetyBackup),
    });
  } catch (error: any) {
    console.error('Restore error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
