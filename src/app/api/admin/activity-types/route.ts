import { NextRequest, NextResponse } from 'next/server';
import { getUserFromSession } from '@/lib/auth';
import { dbAll, dbRun } from '@/lib/database';
import { cache, CACHE_TTL } from '@/lib/cache';

// GET /api/admin/activity-types - List activity types
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const types = await dbAll(
      `SELECT id, name, multiplier, description, created_at
       FROM activity_types
       ORDER BY name ASC`
    );

    return NextResponse.json({ success: true, data: types });
  } catch (error: any) {
    console.error('Error fetching activity types:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/admin/activity-types - Create activity type
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
    const existing = await dbAll('SELECT id FROM activity_types WHERE name = ?', [name]);
    if (existing.length > 0) {
      return NextResponse.json(
        {
          error: 'Activity type name already exists',
        },
        { status: 409 }
      );
    }

    // Insert
    const result = await dbRun(
      `INSERT INTO activity_types (name, multiplier, description, created_at)
       VALUES (?, ?, ?, datetime('now'))`,
      [name, multiplier, description || null]
    );

    // Invalidate cache
    cache.invalidatePrefix('activity_types');

    // Audit log
    await dbRun(
      `INSERT INTO audit_logs (actor_id, action, target_table, target_id, details, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [
        user.id,
        'CREATE',
        'activity_types',
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
    console.error('Error creating activity type:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
