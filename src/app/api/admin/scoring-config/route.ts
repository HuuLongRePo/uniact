import { NextRequest, NextResponse } from 'next/server';
import { dbRun, dbGet, dbAll } from '@/lib/database';
import { getUserFromToken } from '@/lib/auth';

// GET /api/admin/scoring-config - Lấy toàn bộ cấu hình tính điểm
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserFromToken(token);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin only' }, { status: 403 });
    }

    // Lấy tất cả cấu hình
    const [
      scoringRules,
      activityTypes,
      organizationLevels,
      achievementMultipliers,
      awardBonuses,
      systemConfig,
    ] = await Promise.all([
      dbAll('SELECT * FROM scoring_rules ORDER BY is_active DESC, id DESC'),
      dbAll('SELECT * FROM activity_types ORDER BY name'),
      dbAll('SELECT * FROM organization_levels ORDER BY multiplier DESC'),
      dbAll('SELECT * FROM achievement_multipliers ORDER BY multiplier DESC'),
      dbAll('SELECT * FROM award_bonuses ORDER BY bonus_points DESC'),
      dbAll("SELECT * FROM system_config WHERE category = 'scoring' ORDER BY config_key"),
    ]);

    return NextResponse.json(
      {
        scoringRules,
        activityTypes,
        organizationLevels,
        achievementMultipliers,
        awardBonuses,
        systemConfig,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Get scoring config error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/admin/scoring-config - Cập nhật cấu hình
export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserFromToken(token);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin only' }, { status: 403 });
    }

    const body = await request.json();
    const { type, data } = body;

    // Validate
    if (!type || !data) {
      return NextResponse.json({ error: 'Missing type or data' }, { status: 400 });
    }

    switch (type) {
      case 'activity_type':
        // Update activity type base_points
        await dbRun('UPDATE activity_types SET base_points = ?, color = ? WHERE id = ?', [
          data.base_points,
          data.color || '#3B82F6',
          data.id,
        ]);
        break;

      case 'organization_level':
        // Update organization level multiplier
        await dbRun('UPDATE organization_levels SET multiplier = ? WHERE id = ?', [
          data.multiplier,
          data.id,
        ]);
        break;

      case 'achievement_multiplier':
        // Update achievement multiplier
        await dbRun(
          'UPDATE achievement_multipliers SET multiplier = ?, description = ?, updated_at = datetime("now") WHERE achievement_level = ?',
          [data.multiplier, data.description || '', data.achievement_level]
        );
        break;

      case 'award_bonus':
        // Update award bonus points
        await dbRun(
          'UPDATE award_bonuses SET bonus_points = ?, description = ?, updated_at = datetime("now") WHERE award_type = ?',
          [data.bonus_points, data.description || '', data.award_type]
        );
        break;

      case 'scoring_rule':
        // Update scoring rule
        await dbRun(
          'UPDATE scoring_rules SET formula = ?, description = ?, is_active = ?, updated_at = datetime("now"), updated_by = ? WHERE id = ?',
          [data.formula, data.description || '', data.is_active ? 1 : 0, user.id, data.id]
        );

        // If activating this rule, deactivate others
        if (data.is_active) {
          await dbRun('UPDATE scoring_rules SET is_active = 0 WHERE id != ?', [data.id]);
          await dbRun(
            "UPDATE system_config SET config_value = ? WHERE config_key = 'active_scoring_rule_id'",
            [data.id.toString()]
          );
        }
        break;

      case 'system_config':
        // Update system config
        await dbRun(
          'UPDATE system_config SET config_value = ?, updated_by = ?, updated_at = datetime("now") WHERE config_key = ?',
          [data.config_value, user.id, data.config_key]
        );
        break;

      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    // Audit log
    const auditTarget = (() => {
      switch (type) {
        case 'activity_type':
          return {
            table: 'activity_types',
            id: Number.isFinite(Number(data?.id)) ? Number(data.id) : null,
          };
        case 'organization_level':
          return {
            table: 'organization_levels',
            id: Number.isFinite(Number(data?.id)) ? Number(data.id) : null,
          };
        case 'achievement_multiplier':
          return { table: 'achievement_multipliers', id: null };
        case 'award_bonus':
          return { table: 'award_bonuses', id: null };
        case 'scoring_rule':
          return {
            table: 'scoring_rules',
            id: Number.isFinite(Number(data?.id)) ? Number(data.id) : null,
          };
        case 'system_config':
          return { table: 'system_config', id: null };
        default:
          return { table: String(type || 'unknown'), id: null };
      }
    })();

    await dbRun(
      'INSERT INTO audit_logs (actor_id, action, target_table, target_id, details) VALUES (?, ?, ?, ?, ?)',
      [user.id, 'update_scoring_config', auditTarget.table, auditTarget.id, JSON.stringify(data)]
    );

    return NextResponse.json({ success: true, message: 'Cập nhật thành công' }, { status: 200 });
  } catch (error: any) {
    console.error('Update scoring config error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/admin/scoring-config - Tạo mới scoring rule
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserFromToken(token);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin only' }, { status: 403 });
    }

    const body = await request.json();
    const { name, formula, description } = body;

    // Validate
    if (!name || !formula) {
      return NextResponse.json({ error: 'Missing name or formula' }, { status: 400 });
    }

    // Insert new scoring rule
    const result = await dbRun(
      'INSERT INTO scoring_rules (name, formula, description, is_active, updated_by) VALUES (?, ?, ?, 0, ?)',
      [name, formula, description || '', user.id]
    );

    // Audit log
    await dbRun(
      'INSERT INTO audit_logs (actor_id, action, target_table, target_id, details) VALUES (?, ?, ?, ?, ?)',
      [
        user.id,
        'create_scoring_rule',
        'scoring_rules',
        result.lastID,
        JSON.stringify({ name, formula }),
      ]
    );

    return NextResponse.json(
      { success: true, message: 'Tạo công thức thành công', id: result.lastID },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create scoring rule error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
