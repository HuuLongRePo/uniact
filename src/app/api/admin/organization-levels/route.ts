import { NextRequest, NextResponse } from 'next/server';
import { getUserFromSession } from '@/lib/auth';
import { dbAll, dbRun } from '@/lib/database';
import { cache } from '@/lib/cache';

// GET /api/admin/organization-levels - List organization levels
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const levels = await dbAll(
      `SELECT id, name, multiplier, description, created_at
       FROM organization_levels
       ORDER BY multiplier DESC`
    );

    return NextResponse.json({ success: true, data: levels });
  } catch (error: any) {
    console.error('Error fetching organization levels:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/admin/organization-levels - Create organization level
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, multiplier, description } = body;

    // Validation
    if (!name || multiplier === undefined) {
      return NextResponse.json(
        {
          error: 'Missing required fields: name, multiplier',
        },
        { status: 400 }
      );
    }

    if (typeof multiplier !== 'number' || multiplier < 0) {
      return NextResponse.json(
        {
          error: 'Multiplier must be a positive number',
        },
        { status: 400 }
      );
    }

    // Check duplicates
    const existing = await dbAll('SELECT id FROM organization_levels WHERE name = ?', [name]);
    if (existing.length > 0) {
      return NextResponse.json(
        {
          error: 'Organization level name already exists',
        },
        { status: 409 }
      );
    }

    // Insert
    const result = await dbRun(
      `INSERT INTO organization_levels (name, multiplier, description, created_at)
       VALUES (?, ?, ?, datetime('now'))`,
      [name, multiplier, description || null]
    );

    // Invalidate cache
    cache.invalidatePrefix('organization_levels');

    // Audit log
    await dbRun(
      `INSERT INTO audit_logs (actor_id, action, target_table, target_id, details, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [
        user.id,
        'CREATE',
        'organization_levels',
        result.lastID,
        JSON.stringify({ name, multiplier, description }),
      ]
    );

    return NextResponse.json(
      {
        success: true,
        data: { id: result.lastID, name, multiplier, description },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating organization level:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
