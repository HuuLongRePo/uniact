import { NextRequest, NextResponse } from 'next/server';
import { dbAll, dbRun } from '@/lib/database';

// GET /api/cron/cleanup-qr - Clean up expired QR code sessions
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'dev-secret-change-in-production';

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Chưa xác thực' }, { status: 401 });
    }

    console.warn('🧹 Starting QR session cleanup cron job...');

    // Find expired QR sessions (older than 24 hours)
    const expiredSessions = await dbAll(`
      SELECT id, activity_id, created_at
      FROM qr_sessions
      WHERE created_at < datetime('now', '-24 hours')
        AND is_active = 1
    `);

    console.warn(`  Found ${expiredSessions.length} expired sessions`);

    // Deactivate expired sessions
    const result = await dbRun(`
      UPDATE qr_sessions
      SET is_active = 0
      WHERE created_at < datetime('now', '-24 hours')
        AND is_active = 1
    `);

    console.warn(`  ✅ Deactivated ${result.changes} QR sessions`);

    // Optional: Delete very old sessions (older than 30 days) to save space
    const deleteResult = await dbRun(`
      DELETE FROM qr_sessions
      WHERE created_at < datetime('now', '-30 days')
    `);

    console.warn(`  🗑️  Deleted ${deleteResult.changes} old sessions (>30 days)`);

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${result.changes} expired QR sessions`,
      stats: {
        deactivated: result.changes,
        deleted: deleteResult.changes,
        total_processed: expiredSessions.length,
      },
    });
  } catch (error: any) {
    console.error('QR cleanup cron error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
