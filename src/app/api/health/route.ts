import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { dbGet, dbAll } from '@/lib/database';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

const startTime = Date.now();

export async function GET(_req: NextRequest) {
  try {
    // Uptime
    const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
    const uptimeHours = +(uptimeSeconds / 3600).toFixed(2);

    // Database file stats
    // Align with app DB path (uniact.db)
    const dbPath = path.join(process.cwd(), 'uniact.db');
    let dbSizeBytes = 0;
    try {
      const stat = fs.statSync(dbPath);
      dbSizeBytes = stat.size;
    } catch {}

    // Tables count
    let tableCount = 0;
    try {
      const row = (await dbGet(
        "SELECT COUNT(*) as c FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
      )) as { c?: number };
      tableCount = row?.c || 0;
    } catch {}

    // Migration info
    let migrationsApplied = 0;
    let latestMigration: { version: string; name: string; applied_at: string } | null = null;
    try {
      const rows = (await dbAll(
        'SELECT version, name, applied_at FROM migrations ORDER BY applied_at ASC'
      )) as any[];
      migrationsApplied = rows.length;
      if (rows.length) {
        const last = rows[rows.length - 1];
        latestMigration = { version: last.version, name: last.name, applied_at: last.applied_at };
      }
    } catch {}

    // Disk space (Windows specific attempt, fallback to unknown)
    const disk: {
      free_bytes: number | null;
      total_bytes: number | null;
      percent_free: number | null;
    } = { free_bytes: null, total_bytes: null, percent_free: null };
    try {
      if (process.platform === 'win32') {
        const out = execSync('wmic logicaldisk where Caption="C:" get FreeSpace,Size /value', {
          encoding: 'utf8',
        });
        const freeMatch = out.match(/FreeSpace=(\d+)/);
        const sizeMatch = out.match(/Size=(\d+)/);
        if (freeMatch && sizeMatch) {
          const free = parseInt(freeMatch[1], 10);
          const total = parseInt(sizeMatch[1], 10);
          disk.free_bytes = free;
          disk.total_bytes = total;
          disk.percent_free = +((free / total) * 100).toFixed(2);
        }
      }
    } catch {}

    // Simple connectivity check (attempt a trivial query)
    let databaseStatus: 'ok' | 'error' = 'ok';
    try {
      await dbGet('SELECT 1 as ok');
    } catch {
      databaseStatus = 'error';
    }

    return successResponse({
      status: 'ok',
      uptime_seconds: uptimeSeconds,
      uptime_hours: uptimeHours,
      database: {
        status: databaseStatus,
        path: dbPath,
        size_bytes: dbSizeBytes,
        size_mb: +(dbSizeBytes / 1024 / 1024).toFixed(2),
        tables: tableCount,
        migrations_applied: migrationsApplied,
        latest_migration: latestMigration,
      },
      disk,
      node: {
        version: process.version,
        platform: process.platform,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return errorResponse(
      ApiError.internalError('Health check failed', { error: (err as any)?.message })
    );
  }
}
