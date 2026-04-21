import { NextRequest, NextResponse } from 'next/server';
import { getUserFromSession } from '@/lib/auth';
import { dbGet, dbAll } from '@/lib/database';

/**
 * POST /api/participations/:id/calculate-preview
 * Preview point calculation before saving
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getUserFromSession();
    if (!user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const participationId = parseInt(id);
    const body = await request.json();
    const { achievementLevel, awardType, bonusPoints = 0, penaltyPoints = 0 } = body;

    // Get participation details
    const participation = await dbGet(
      `SELECT p.*, a.activity_type_id, a.organization_level_id, a.base_points
       FROM participations p
       JOIN activities a ON p.activity_id = a.id
       WHERE p.id = ?`,
      [participationId]
    );

    if (!participation) {
      return NextResponse.json({ error: 'Không tìm thấy dữ liệu tham gia' }, { status: 404 });
    }

    // Get scoring rule
    const rule = await dbGet('SELECT * FROM scoring_rules WHERE id = 1');
    if (!rule) {
      return NextResponse.json({ error: 'Không tìm thấy quy tắc tính điểm' }, { status: 500 });
    }

    // Get multipliers
    const activityType = await dbGet('SELECT multiplier FROM activity_types WHERE id = ?', [
      participation.activity_type_id,
    ]);

    const orgLevel = await dbGet('SELECT multiplier FROM organization_levels WHERE id = ?', [
      participation.organization_level_id,
    ]);

    const achievement = await dbGet(
      'SELECT multiplier FROM achievement_multipliers WHERE achievement_level = ?',
      [achievementLevel]
    );

    if (!activityType || !orgLevel || !achievement) {
      return NextResponse.json({ error: 'Thiếu hệ số tính điểm' }, { status: 500 });
    }

    // Calculate base
    const basePoints = participation.base_points || 10;
    const typeMultiplier = activityType.multiplier;
    const levelMultiplier = orgLevel.multiplier;
    const achievementMultiplier = achievement.multiplier;

    const subtotal = basePoints * typeMultiplier * levelMultiplier * achievementMultiplier;

    // Add award bonus if any
    let totalBonusPoints = bonusPoints;
    if (awardType) {
      const award = await dbGet('SELECT bonus_points FROM award_bonuses WHERE award_type = ?', [
        awardType,
      ]);
      if (award) {
        totalBonusPoints += award.bonus_points;
      }
    }

    const totalPoints = subtotal + totalBonusPoints - penaltyPoints;

    const formula = `(base × type × level × achievement) + awards - penalties`;

    return NextResponse.json({
      success: true,
      data: {
        basePoints,
        typeMultiplier,
        levelMultiplier,
        achievementMultiplier,
        subtotal,
        bonusPoints: totalBonusPoints,
        penaltyPoints,
        totalPoints,
        formula,
      },
    });
  } catch (error: any) {
    console.error('Error calculating preview:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
