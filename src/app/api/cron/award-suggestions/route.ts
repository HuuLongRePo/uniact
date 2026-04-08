import { NextRequest, NextResponse } from 'next/server';
import { dbAll, dbGet, dbRun } from '@/lib/database';

// GET /api/cron/award-suggestions - Auto-suggest awards for outstanding students
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (production security)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'dev-secret-change-in-production';

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.warn('🏆 Starting award suggestions cron job...');

    // Find students with outstanding performance (last 30 days)
    const candidates = await dbAll(`
      SELECT 
        u.id as student_id,
        u.name as student_name,
        u.email as student_email,
        COUNT(DISTINCT p.id) as activities_count,
        COUNT(DISTINCT CASE WHEN p.achievement_level = 'excellent' THEN p.id END) as excellent_count,
        COALESCE(SUM(pc.total_points), 0) as total_points,
        COALESCE(AVG(pc.total_points), 0) as avg_points
      FROM users u
      JOIN participations p ON u.id = p.student_id
      LEFT JOIN point_calculations pc ON p.id = pc.participation_id
      WHERE u.role = 'student'
        AND p.status = 'attended'
        AND p.registered_at >= datetime('now', '-30 days')
      GROUP BY u.id
      HAVING activities_count >= 5 
        AND excellent_count >= 3
        AND total_points >= 50
      ORDER BY total_points DESC
      LIMIT 20
    `);

    const suggestions = [];

    for (const candidate of candidates) {
      // Check if already has pending/approved suggestion this month
      const existingSuggestion = await dbAll(
        `SELECT id FROM award_suggestions 
         WHERE student_id = ? 
           AND suggested_at >= datetime('now', 'start of month')
           AND status IN ('pending', 'approved')`,
        [candidate.student_id]
      );

      if (existingSuggestion.length > 0) {
        console.warn(`  ⏭️  Skip ${candidate.student_name} - Already has suggestion this month`);
        continue;
      }

      // Determine award type based on performance
      let awardType = 'Giải Khuyến Khích';
      let bonusPoints = 10;

      if (candidate.excellent_count >= 5 && candidate.total_points >= 100) {
        awardType = 'Giải Nhất';
        bonusPoints = 30;
      } else if (candidate.excellent_count >= 4 && candidate.total_points >= 75) {
        awardType = 'Giải Nhì';
        bonusPoints = 20;
      } else if (candidate.excellent_count >= 3 && candidate.total_points >= 50) {
        awardType = 'Giải Ba';
        bonusPoints = 15;
      }

      const note = `Tự động đề xuất: ${candidate.activities_count} hoạt động, ${candidate.excellent_count} xuất sắc, ${candidate.total_points} điểm trong 30 ngày (+${bonusPoints} điểm)`;

      // Ensure award type exists (best-effort)
      let awardTypeRow = (await dbGet('SELECT id FROM award_types WHERE lower(name) = lower(?)', [
        awardType,
      ])) as any;

      if (!awardTypeRow?.id) {
        try {
          await dbRun(
            `INSERT INTO award_types (name, description, min_points)
             VALUES (?, ?, ?)`,
            [awardType, 'Auto-created by cron suggestion', 0]
          );
        } catch {
          // ignore (race/unique)
        }
        awardTypeRow = (await dbGet('SELECT id FROM award_types WHERE lower(name) = lower(?)', [
          awardType,
        ])) as any;
      }

      if (!awardTypeRow?.id) {
        console.warn(
          `  ⚠️  Skip ${candidate.student_name} - Cannot resolve award type: ${awardType}`
        );
        continue;
      }

      // Create award suggestion (schema-backed)
      const result = await dbRun(
        `INSERT INTO award_suggestions (
          student_id, award_type_id, score_snapshot, status, note, suggested_at
        ) VALUES (?, ?, ?, 'pending', ?, datetime('now'))`,
        [candidate.student_id, awardTypeRow.id, candidate.total_points, note]
      );

      suggestions.push({
        student_id: candidate.student_id,
        student_name: candidate.student_name,
        award_type: awardType,
        bonus_points: bonusPoints,
        suggestion_id: result.lastID,
      });

      console.warn(
        `  ✅ Created award suggestion for ${candidate.student_name}: ${awardType} (+${bonusPoints} points)`
      );
    }

    console.warn(`🏆 Award suggestions completed: ${suggestions.length} awards created`);

    return NextResponse.json({
      success: true,
      message: `Created ${suggestions.length} award suggestions`,
      data: suggestions,
    });
  } catch (error: any) {
    console.error('Award suggestions cron error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
