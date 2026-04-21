import { NextRequest, NextResponse } from 'next/server';
import { getUserFromSession } from '@/lib/auth';
import { dbGet, dbRun } from '@/lib/database';

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromSession();

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Chưa xác thực' }, { status: 403 });
    }

    const { formula, variables } = await req.json();

    if (!formula) {
      return NextResponse.json({ error: 'Công thức là bắt buộc' }, { status: 400 });
    }

    // Check if formula already exists
    const existing = await dbGet('SELECT id FROM scoring_rules WHERE name = ?', ['Custom Formula']);

    if (existing) {
      // Update existing
      await dbRun(
        `UPDATE scoring_rules 
         SET formula = ?, description = ?, updated_at = datetime('now'), updated_by = ?
         WHERE id = ?`,
        [formula, JSON.stringify(variables || {}), user.id, existing.id]
      );
    } else {
      // Insert new
      await dbRun(
        `INSERT INTO scoring_rules (name, formula, description, is_active, updated_by)
         VALUES (?, ?, ?, ?, ?)`,
        ['Custom Formula', formula, JSON.stringify(variables || {}), 1, user.id]
      );
    }

    // Update system config to use this formula
    await dbRun(
      `INSERT OR REPLACE INTO system_config (config_key, config_value, data_type, category, description)
       VALUES (?, ?, ?, ?, ?)`,
      ['active_scoring_formula', formula, 'string', 'scoring', 'Active scoring formula']
    );

    return NextResponse.json({
      success: true,
      message: 'Formula saved successfully',
    });
  } catch (error: any) {
    console.error('Save formula error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromSession();

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Chưa xác thực' }, { status: 403 });
    }

    // Get active formula
    const activeFormula = await dbGet(
      `SELECT sr.*, sc.config_value as active_formula
       FROM scoring_rules sr
       LEFT JOIN system_config sc ON sc.config_key = 'active_scoring_formula'
       WHERE sr.is_active = 1
       ORDER BY sr.updated_at DESC
       LIMIT 1`
    );

    return NextResponse.json({
      formula: activeFormula || {
        name: 'Công thức chuẩn',
        formula: '(base × type × level × achievement) + bonus - penalty',
        description: '{}',
        is_active: 1,
      },
    });
  } catch (error: any) {
    console.error('Get formula error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
